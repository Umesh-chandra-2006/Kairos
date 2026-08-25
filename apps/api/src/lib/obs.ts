import { logger } from "./logger";

/**
 * Domain event logging (build-plan §0.7). One line per meaningful state
 * change, with stable field names so logs stay queryable:
 *   evt=... userId answerId durationMs provider outcome
 * Always log the event name as `evt` plus structured fields — never embed ids
 * in free-text messages.
 */
export const DOMAIN_EVENTS = [
  "eval_started",
  "eval_completed",
  "eval_failed",
  "eval_claim_skipped",
] as const;
export type DomainEvent = (typeof DOMAIN_EVENTS)[number];

export function logDomainEvent(event: DomainEvent, fields: Record<string, unknown> = {}): void {
  logger.info({ evt: event, ...fields }, event);
}
