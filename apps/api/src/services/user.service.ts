import type { PublicUser } from "@kairos/shared";
import type { User } from "@kairos/db/schema";

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified,
    profile: u.profile as PublicUser["profile"],
    createdAt: u.createdAt.toISOString(),
  };
}
