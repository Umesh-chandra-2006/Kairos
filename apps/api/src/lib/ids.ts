import crypto from "node:crypto";

/** Generate a cryptographically-random opaque token. */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** SHA-256 hash of a token — used so only hashes are stored in the DB. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Stable integer seed for deterministic per-user/day question selection. */
export function seedFromInts(...ints: number[]): number {
  let h = 2166136261;
  for (const n of ints) {
    const s = String(n);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}
