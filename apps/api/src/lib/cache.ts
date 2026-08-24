import { getEnv } from "@kairos/config";
import Redis from "ioredis";
import { logger } from "./logger";

let client: Redis | null = null;

function getClient(): Redis | null {
  const url = getEnv().REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3_000,
    });
    client.on("error", (err) => logger.warn({ err }, "Redis unavailable (degraded mode)"));
    // Start connecting immediately (ioredis only auto-connects on next tick,
    // which races the very first command otherwise).
    void client.connect().catch(() => undefined);
  }
  return client;
}

/** Ensure the client has an established connection before issuing commands. */
async function ready(c: Redis): Promise<boolean> {
  if (c.status === "wait" || c.status === "close" || c.status === "end") {
    try {
      await c.connect();
    } catch {
      return false;
    }
  }
  if ((c.status as string) === "ready") return true;
  // The client may have just begun connecting (lazy init) and ioredis rejects
  // a second connect() while status is "connecting". Wait for it to reach ready.
  const deadline = Date.now() + 3_000;
  while ((c.status as string) !== "ready" && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return (c.status as string) === "ready";
}

async function run<T>(fn: (c: Redis) => Promise<T>): Promise<T | null> {
  try {
    const c = getClient();
    if (!c) return null;
    if (!(await ready(c))) return null;
    return await fn(c);
  } catch {
    return null;
  }
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await run((c) => c.get(key));
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    await run(async (c) => {
      await c.set(key, JSON.stringify(value), "EX", ttlSeconds);
    });
  },
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await run(async (c) => {
      await c.del(...keys);
    });
  },
};

export async function closeCache(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}

/** Raw ioredis client for advanced use (pub/sub-free). Null when Redis is off. */
export function getRedis(): Redis | null {
  return getClient();
}

/** Ensure the shared client connection is established. */
export async function redisReady(): Promise<boolean> {
  const c = getRedis();
  if (!c) return false;
  return ready(c);
}
