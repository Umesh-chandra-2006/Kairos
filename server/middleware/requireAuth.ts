import { Request, Response, NextFunction } from "express";
import { getDB } from "../lib/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "../_core/jwt";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = (req.headers.authorization as string) || (req.cookies?.authorization as string) || null;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace(/^Bearer\s+/, "");
    const payload = await verifyToken(token);
    if (!payload || !payload.userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDB();
    const user = await db.query.users.findFirst({ where: eq(users.id, Number(payload.userId)) });
    if (!user) return res.status(401).json({ error: "User not found" });

    (req as any).userId = user.id;
    (req as any).user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}
