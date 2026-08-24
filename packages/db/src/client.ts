import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export type DB = MySql2Database<typeof schema>;

let pool: mysql.Pool | null = null;
let dbInstance: DB | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    pool = mysql.createPool({
      uri: url,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      connectTimeout: 5_000,
    });
  }
  return pool;
}

export function getDb(): DB {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema, mode: "default" });
  }
  return dbInstance;
}

export function createDbFromUrl(url: string): DB {
  const p = mysql.createPool({ uri: url, connectionLimit: 5, connectTimeout: 5_000 });
  return drizzle(p, { schema, mode: "default" });
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
  }
  pool = null;
  dbInstance = null;
}
