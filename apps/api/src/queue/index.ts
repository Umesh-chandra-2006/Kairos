import { getEnv } from "@kairos/config";
import { logger } from "../lib/logger";
import { createInProcessRuntime } from "./inProcess";
import { createRedisRuntime } from "./redis";
import type { RuntimeDeps } from "./types";

let runtime: RuntimeDeps | null = null;

export async function initRuntime(): Promise<RuntimeDeps> {
  const redisUrl = getEnv().REDIS_URL;
  if (redisUrl) {
    try {
      runtime = createRedisRuntime(redisUrl);
      logger.info({ redisUrl }, "Using Redis-backed job queue");
      return runtime;
    } catch (err) {
      logger.warn({ err }, "Failed to connect to Redis, falling back to in-process runtime");
    }
  }
  runtime = createInProcessRuntime();
  logger.info("Using in-process job queue");
  return runtime;
}

export function getRuntime(): RuntimeDeps {
  if (!runtime) throw new Error("Runtime not initialized");
  return runtime;
}
