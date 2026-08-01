import type { AnswerStatus } from "@kairos/shared";

export type EvalJobData = {
  answerId: number;
  userId: number;
  questionId: number;
  attempt: number;
};

export type StreamEvent =
  | { type: "status"; status: AnswerStatus }
  | { type: "token"; delta: string }
  | {
      type: "done";
      score: number;
      feedback: string;
      modelAnswer: string;
      streak: { current: number; longest: number };
    }
  | { type: "error"; message: string };

export interface EventHub {
  publish(channel: string, event: StreamEvent): Promise<void>;
  subscribe(channel: string, handler: (event: StreamEvent) => void): () => void;
  close(): Promise<void>;
}

export interface JobQueue {
  enqueue(data: EvalJobData): Promise<void>;
  registerWorker(handler: (data: EvalJobData) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

export interface RuntimeDeps {
  queue: JobQueue;
  hub: EventHub;
  close(): Promise<void>;
}
