import { EventEmitter } from "node:events";
import type { EventHub, EvalJobData, JobQueue, RuntimeDeps, StreamEvent } from "./types";

/**
 * Zero-dependency runtime used when Redis is unavailable (local dev, CI).
 * Jobs run inline; events fan out in-process. Perfectly fine for one instance.
 */
export function createInProcessRuntime(): RuntimeDeps {
  const emitter = new EventEmitter();
  let handler: ((data: EvalJobData) => Promise<void>) | null = null;

  const hub: EventHub = {
    async publish(channel, event: StreamEvent) {
      emitter.emit(channel, event);
    },
    subscribe(channel, cb) {
      emitter.on(channel, cb);
      return () => emitter.off(channel, cb);
    },
    async close() {
      emitter.removeAllListeners();
    },
  };

  const queue: JobQueue = {
    async enqueue(data: EvalJobData) {
      if (!handler) return;
      // Run async, do not block the request handler.
      void handler(data).catch((err) => {
        console.error("[in-process queue] job failed", err);
      });
    },
    async registerWorker(worker) {
      handler = worker;
    },
    async close() {
      handler = null;
    },
  };

  return {
    queue,
    hub,
    async close() {
      await hub.close();
      await queue.close();
    },
  };
}
