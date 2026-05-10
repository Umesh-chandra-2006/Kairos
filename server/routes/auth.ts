import { Router, Request, Response } from "express";
import crypto from "crypto";
import { getDB } from "../lib/db";
import { users, streaks } from "../../drizzle/schema";
import { requireAuth } from "../middleware/requireAuth";
import { signToken } from "../_core/jwt";
import { loginSchema, registerSchema, onboardingSchema } from "../validations";
import { eq } from "drizzle-orm";

const router = Router();

// Password hashing helpers
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
    }

    const { name, email, password } = validationResult.data;
    const db = getDB();

    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const passwordHash = hashPassword(password);

    await db.insert(users).values({
      name,
      email,
      passwordHash,
      role: "user",
    });

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    await db.insert(streaks).values({ userId: user.id, current: 0, longest: 0, freezesRemaining: 1 });

    const token = await signToken({ userId: user.id });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboarded: false,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
    }

    const { email, password } = validationResult.data;
    const db = getDB();

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = await signToken({ userId: user.id });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboarded: !!(user.profileRole && user.profileLevel),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = (req.headers.authorization as string) || (req.cookies?.authorization as string) || null;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(200).json({ user: null });

    const token = authHeader.replace(/^Bearer\s+/, "");
    const payload = await import("../_core/jwt").then(m => m.verifyToken(token));
    if (!payload || !payload.userId) return res.status(200).json({ user: null });

    const db = getDB();
    const user = await db.query.users.findFirst({ where: eq(users.id, Number(payload.userId)) });
    if (!user) return res.status(200).json({ user: null });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboarded: !!(user.profileRole && user.profileLevel),
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    res.status(200).json({ user: null });
  }
});

// POST /api/auth/onboarding
router.post("/onboarding", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate input
    const validationResult = onboardingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.flatten(),
      });
    }

    const { role, level, targets, notificationTime } = validationResult.data;
    const db = getDB();

    await db
      .update(users)
      .set({
        profileRole: role,
        profileLevel: level,
        profileTargets: targets ? JSON.stringify(targets) : null,
        notificationTime,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({
      error: "Failed to update profile",
      ...(process.env.NODE_ENV !== "production" && {
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    });
  }
});

export default router;
