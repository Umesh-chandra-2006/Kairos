import * as Sentry from "@sentry/node";
import { getEnv } from "@kairos/config";
import { logger } from "../lib/logger";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = getEnv().SENTRY_DSN;
  if (!dsn) {
    logger.info("Sentry DSN not set — error tracking disabled");
    return;
  }
  Sentry.init({
    dsn,
    environment: getEnv().NODE_ENV,
    tracesSampleRate: getEnv().NODE_ENV === "production" ? 0.2 : 1.0,
    integrations: [Sentry.httpIntegration({ spans: false })],
  });
  initialized = true;
  logger.info("Sentry initialized");
}

export function sentryErrorHandler() {
  return Sentry.setupExpressErrorHandler;
}
