import { SignJWT, jwtVerify } from 'jose';
import { createSecretKey } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}
const key = createSecretKey(Buffer.from(JWT_SECRET, 'utf8'));

export async function signToken(payload: Record<string, any>, expiresIn = '7d') {
  const alg = 'HS256';
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key as any);
  return jwt;
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key as any);
    return payload as Record<string, any>;
  } catch (e) {
    return null;
  }
}
