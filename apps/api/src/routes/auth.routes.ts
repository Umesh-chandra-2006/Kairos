import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { users } from "@kairos/db/schema";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
} from "@kairos/shared";
import { asyncHandler } from "../lib/http";
import { clearRefreshCookie, setRefreshCookie } from "../lib/cookies";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { authService, type AuthResult } from "../services/auth.service";
import { toPublicUser } from "../services/user.service";

export const authRouter: Router = Router();

type Device = "web" | "mobile";

function resolveRefreshToken(req: { cookies?: Record<string, string>; body?: { refreshToken?: string } }): string | null {
  const fromCookie = req.cookies?.["kairos_refresh"];
  const fromBody = req.body?.refreshToken;
  return fromCookie ?? fromBody ?? null;
}

function sendAuthResult(res: Parameters<typeof setRefreshCookie>[0], result: AuthResult, device: Device) {
  if (device === "web") {
    setRefreshCookie(res, result.refreshToken);
    res.json({
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      user: result.user,
    });
    return;
  }
  res.json(result);
}

authRouter.post(
  "/register",
  authRateLimit(),
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const input = req.body as RegisterInput;

    // Honeypot: bots fill hidden fields, humans don't
    if ((req.body as Record<string, unknown>)._website || (req.body as Record<string, unknown>)._email_confirm) {
      // Silently return a fake success so bots don't retry with different params
      res.status(201).json({ ok: true });
      return;
    }

    const result = await authService.register(db, {
      name: input.name,
      email: input.email,
      password: input.password,
    });
    sendAuthResult(res, result, (input as RegisterInput & { device?: Device }).device ?? "web");

    if (result.user && input.referralCode) {
      try {
        const { applyReferralCode } = await import("../services/referral.js");
        await applyReferralCode(result.user.id, input.referralCode);
      } catch {
        /* referral is best-effort — don't fail registration */
      }
    }
  }),
);

authRouter.post(
  "/login",
  authRateLimit(),
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const input = req.body as LoginInput;
    const result = await authService.login(db, { email: input.email, password: input.password });
    sendAuthResult(res, result, input.device ?? "web");
  }),
);

authRouter.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const input = req.body as RefreshInput;
    const device: Device = input.device ?? "web";
    const token = resolveRefreshToken(req);
    if (!token) {
      clearRefreshCookie(res);
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "No refresh token" } });
      return;
    }
    const result = await authService.refresh(db, token);
    sendAuthResult(res, result, device);
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const token = resolveRefreshToken(req);
    if (token) await authService.logout(db, token);
    clearRefreshCookie(res);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/verify-email",
  validate(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await authService.verifyEmail(db, (req.body as { token: string }).token);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await authService.requestPasswordReset(db, (req.body as { email: string }).email);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const input = req.body as { token: string; password: string };
    await authService.resetPassword(db, input.token, input.password);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const input = req.body as { currentPassword: string; newPassword: string };
    await authService.changePassword(db, req.userId!, input.currentPassword, input.newPassword);
    clearRefreshCookie(res);
    res.json({ ok: true });
  }),
);

authRouter.put(
  "/me/onboarding",
  requireAuth,
  validate(onboardingSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const user = await authService.onboarding(db, req.userId!, req.body);
    res.json({ user });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    res.json({ user: toPublicUser(user) });
  }),
);

/**
 * Session restore for app boot. Unlike /me (which requires an access token)
 * and /refresh (which 401s without a token), this endpoint ALWAYS returns
 * 200: it restores the session from the HttpOnly refresh cookie when present,
 * otherwise it reports { user: null }. The web client calls this on page load
 * so that a fresh load never triggers console noise from a 401.
 */
authRouter.get(
  "/session",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const token = resolveRefreshToken(req);
    if (!token) {
      res.json({ user: null });
      return;
    }
    try {
      const result = await authService.refresh(db, token);
      setRefreshCookie(res, result.refreshToken);
      res.json({
        user: result.user,
        accessToken: result.accessToken,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
      });
    } catch {
      clearRefreshCookie(res);
      res.json({ user: null });
    }
  }),
);
