import { and, eq, isNull } from "drizzle-orm";
import { getDb, type DB } from "@kairos/db";
import {
  emailTokens,
  notificationPrefs,
  refreshTokens,
  streaks,
  users,
  type User,
} from "@kairos/db/schema";
import type { OnboardingInput, PublicUser } from "@kairos/shared";
import { sendPasswordResetEmail, sendVerificationEmail } from "@kairos/email";
import { AppError } from "../lib/http";
import { generateOpaqueToken, hashToken } from "../lib/ids";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { refreshTokenTtlMs, signAccessToken } from "../lib/tokens";
import { toPublicUser } from "./user.service";

const EMAIL_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  user: PublicUser;
}

async function createRefreshTokenRow(db: DB, userId: number): Promise<string> {
  const token = generateOpaqueToken(48);
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
  });
  return token;
}

async function issueTokens(db: DB, userId: number): Promise<AuthResult> {
  const access = await signAccessToken(userId);
  const refreshToken = await createRefreshTokenRow(db, userId);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw AppError.notFound("User not found");
  return {
    accessToken: access.token,
    accessTokenExpiresIn: access.expiresIn,
    refreshToken,
    user: toPublicUser(user),
  };
}

async function findUserByEmail(db: DB, email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export const authService = {
  async register(db: DB, input: { name: string; email: string; password: string }): Promise<AuthResult> {
    const existing = await findUserByEmail(db, input.email);
    if (existing) {
      throw AppError.conflict("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const [inserted] = await db
      .insert(users)
      .values({ email: input.email, passwordHash, name: input.name })
      .$returningId();
    const userId = inserted!.id;

    await db.insert(streaks).values({ userId, current: 0, longest: 0, freezesRemaining: 1 });
    await db.insert(notificationPrefs).values({ userId });

    // Email verification token
    const token = generateOpaqueToken();
    await db.insert(emailTokens).values({
      userId,
      tokenHash: hashToken(token),
      type: "verify_email",
      expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    });
    await sendVerificationEmail(input.email, token);

    return issueTokens(db, userId);
  },

  async login(db: DB, input: { email: string; password: string }): Promise<AuthResult> {
    const user = await findUserByEmail(db, input.email);
    if (!user) throw AppError.unauthorized("Invalid email or password");
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw AppError.unauthorized("Invalid email or password");
    return issueTokens(db, user.id);
  },

  async refresh(db: DB, refreshToken: string): Promise<AuthResult> {
    const row = await this.findActiveRefreshToken(db, refreshToken);
    if (!row) throw AppError.unauthorized("Invalid refresh token");

    if (row.expiresAt.getTime() < Date.now()) {
      await this.revokeRefreshToken(db, row.id);
      throw AppError.unauthorized("Refresh token expired");
    }

    // Rotate: revoke the used token and issue a fresh one.
    await this.revokeRefreshToken(db, row.id);
    const access = await signAccessToken(row.userId);
    const newToken = await createRefreshTokenRow(db, row.userId);
    const [user] = await db.select().from(users).where(eq(users.id, row.userId));
    if (!user) throw AppError.notFound("User not found");
    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      refreshToken: newToken,
      user: toPublicUser(user),
    };
  },

  async logout(db: DB, refreshToken: string): Promise<void> {
    const row = await this.findActiveRefreshToken(db, refreshToken);
    if (row) await this.revokeRefreshToken(db, row.id);
  },

  async changePassword(db: DB, userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw AppError.notFound("User not found");
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw AppError.unauthorized("Current password is incorrect");

    const newHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
    // Force re-auth everywhere.
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId));
  },

  async verifyEmail(db: DB, token: string): Promise<void> {
    const [row] = await db
      .select()
      .from(emailTokens)
      .where(
        and(eq(emailTokens.tokenHash, hashToken(token)), eq(emailTokens.type, "verify_email"), isNull(emailTokens.usedAt)),
      );
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw AppError.validation("Invalid or expired verification link");
    }
    await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, row.userId));
  },

  async requestPasswordReset(db: DB, email: string): Promise<void> {
    const user = await findUserByEmail(db, email);
    if (!user) return; // Never leak whether an email exists.
    const token = generateOpaqueToken();
    await db.insert(emailTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      type: "reset_password",
      expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    });
    await sendPasswordResetEmail(email, token);
  },

  async resetPassword(db: DB, token: string, password: string): Promise<void> {
    const [row] = await db
      .select()
      .from(emailTokens)
      .where(
        and(
          eq(emailTokens.tokenHash, hashToken(token)),
          eq(emailTokens.type, "reset_password"),
          isNull(emailTokens.usedAt),
        ),
      );
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw AppError.validation("Invalid or expired reset link");
    }
    const newHash = await hashPassword(password);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.userId));
    await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, row.userId));
  },

  async onboarding(db: DB, userId: number, input: OnboardingInput): Promise<PublicUser> {
    const profile = {
      role: input.role,
      level: input.level,
      targets: input.targets,
      notificationTime: input.notificationTime,
      timezone: input.timezone,
    };
    const [updated] = await db
      .update(users)
      .set({ profile, timezone: input.timezone ?? undefined })
      .where(eq(users.id, userId));
    void updated;

    const [existingPrefs] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
    if (existingPrefs) {
      await db
        .update(notificationPrefs)
        .set({ reminderTime: input.notificationTime })
        .where(eq(notificationPrefs.userId, userId));
    } else {
      await db.insert(notificationPrefs).values({
        userId,
        reminderTime: input.notificationTime,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw AppError.notFound("User not found");
    return toPublicUser(user);
  },

  async findActiveRefreshToken(db: DB, token: string) {
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, hashToken(token)), isNull(refreshTokens.revokedAt)));
    return row ?? null;
  },

  async revokeRefreshToken(db: DB, id: number): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  },
};

export { toPublicUser };
