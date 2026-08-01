import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "./client";
import type { DB } from "./client";

export async function runMigrations(db: DB = getDb()): Promise<void> {
  const folder = fileURLToPath(new URL("../migrations", import.meta.url));
  await migrate(db, { migrationsFolder: folder });
}
