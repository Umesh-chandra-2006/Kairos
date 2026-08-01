import { getEnv } from "@kairos/config";
import { SignJWT, jwtVerify } from "jose";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

function ttlSeconds(ttl: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(ttl);
  if (!match) throw new Error(`Invalid JWT TTL: ${ttl}`);
  const n = Number(match[1]);
  const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 };
  return n * (mult[match[2]!] ?? 0);
}

export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export async function signAccessToken(userId: number): Promise<{ token: string; expiresIn: number }> {
  const env = getEnv();
  const token = await new SignJWT({ type: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(secretKey());
  return { token, expiresIn: ttlSeconds(env.JWT_ACCESS_TTL) };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
  if (payload.type !== "access" || !payload.sub) {
    throw new Error("Invalid access token payload");
  }
  return { sub: payload.sub, type: "access" };
}

export function refreshTokenTtlMs(): number {
  return ttlSeconds(getEnv().JWT_REFRESH_TTL) * 1000;
}

export const REFRESH_COOKIE = "kairos_refresh";
