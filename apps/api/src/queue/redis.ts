import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type { EventHub, EvalJobData, JobQueue, RuntimeDeps, StreamEvent } from "./types";

const QUEUE_NAME = "answer-eval";

/**
 * Redis-backed runtime: BullMQ for durable, retryable evaluation jobs and
 * Redis pub/sub for streaming LLM tokens to connected SSE clients.
 */
export function createRedisRuntime(redisUrl: string): RuntimeDeps {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const pub = new IORedis(redisUrl);
  const sub = new IORedis(redisUrl);

  const hub: EventHub = {
    async publish(channel, event: StreamEvent) {
      await pub.publish(channel, JSON.stringify(event));
    },
    subscribe(channel, cb) {
      const listener = (_channel: string, message: string) => {
        try {
          cb(JSON.parse(message) as StreamEvent);
        } catch {
          /* ignore malformed */
        }
      };
      void sub.subscribe(channel);
      sub.on("message", listener);
      return () => {
        sub.off("message", listener);
        void sub.unsubscribe(channel);
      };
    },
    async close() {
      pub.disconnect();
      sub.disconnect();
    },
  };

  const bull = new Queue<EvalJobData>(QUEUE_NAME, { connection });
  let worker: Worker<EvalJobData> | null = null;

  const queue: JobQueue = {
    async enqueue(data) {
      await bull.add("eval", data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      });
    },
    async registerWorker(handler) {
      worker = new Worker<EvalJobData>(
        QUEUE_NAME,
        async (job) => {
          await handler(job.data);
        },
        { connection },
      );
    },
    async close() {
      await worker?.close();
      await bull.close();
      connection.disconnect();
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
