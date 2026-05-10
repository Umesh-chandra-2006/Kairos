import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyToken } from "./jwt";
import type { User } from "../../drizzle/schema";
import { getDB } from "../lib/db";
import { users as usersTable } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = (opts.req.headers?.authorization as string) || (opts.req.cookies?.authorization as string) || null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace(/^Bearer\s+/, "");
      const payload = await verifyToken(token);
      if (payload && payload.userId) {
        const db = getDB();
        const foundUser = await db.query.users.findFirst({
          where: eq(usersTable.id, Number(payload.userId)),
        });
        user = foundUser || null;
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
