import { Request, Response, NextFunction } from "express";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
});

export interface AuthRequest extends Request {
  clerkId?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = await clerkClient.verifyToken(token);
    req.clerkId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
