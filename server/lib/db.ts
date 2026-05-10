import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../drizzle/schema";

let db: MySql2Database<typeof schema> | null = null;

export async function connectDB() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  try {
    const connection = await mysql.createConnection(databaseUrl);
    db = drizzle(connection, { schema, mode: "default" });
    // Verify connection
    await connection.ping();
    console.log("✓ Database connected successfully");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    throw error;
  }
}

export function getDB(): MySql2Database<typeof schema> {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
}
