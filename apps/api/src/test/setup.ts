import { beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { closeDb, runMigrations } from "@kairos/db";
import { loadEnv } from "@kairos/config";
import { getRuntime, initRuntime } from "../queue";
import { registerEvalWorker } from "../workers/evalWorker";
import { seedTestQuestions } from "./seed";

const TEST_DB = "kairos_test";
const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "mysql://root:root@localhost:3307";
export const TEST_DB_URL = `${ADMIN_URL}/${TEST_DB}`;

let initialized = false;

beforeAll(async () => {
  if (initialized) return;
  initialized = true;

  const admin = await mysql.createConnection(ADMIN_URL);
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\``);
  await admin.end();

  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.REDIS_URL = "";
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? "test-only-secret-that-is-at-least-32-characters-long";
  process.env.APP_URL = "http://localhost:5173";
  process.env.RATE_LIMIT_MAX = "10000";
  process.env.RATE_LIMIT_AUTH_MAX = "10000";

  // Prime the config cache so the in-process runtime is used (no Redis dependency in tests).
  loadEnv({
    DATABASE_URL: TEST_DB_URL,
    REDIS_URL: "",
    NODE_ENV: "test",
    JWT_SECRET: process.env.JWT_SECRET,
    RATE_LIMIT_MAX: 10000,
    RATE_LIMIT_AUTH_MAX: 10000,
  });

  await runMigrations();
  await seedTestQuestions();

  await initRuntime();
  registerEvalWorker();
});

afterAll(async () => {
  await getRuntime().close().catch(() => undefined);
  await closeDb();
});
