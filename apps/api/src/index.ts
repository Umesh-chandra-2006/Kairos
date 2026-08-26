import { getEnv, loadEnv } from "@kairos/config";
import { closeDb } from "@kairos/db";
import { closeCache } from "./lib/cache";
import { logger } from "./lib/logger";
import { initSentry } from "./lib/sentry";
import { initRuntime } from "./queue";
import { registerEvalWorker } from "./workers/evalWorker";
import { registerScheduler } from "./workers/scheduler";
import { createApp } from "./app";

async function main(): Promise<void> {
  const env = loadEnv();
  initSentry();
  const runtime = await initRuntime();
  registerEvalWorker();
  registerScheduler();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "API listening");
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");
    server.close();
    await runtime.close().catch(() => undefined);
    await closeCache();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
