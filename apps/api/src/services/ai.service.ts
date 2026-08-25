import { getAIProvider } from "./providers";
import type { EventHub } from "../queue/types";

export interface EvaluationResult {
  score: number;
  feedback: string;
  modelAnswer: string;
}

interface EvalParams {
  questionId: number;
  questionText: string;
  rubricHints: string;
  level: string;
  answerText: string;
  userId: number;
  answerId: number;
  hub: EventHub;
}

/**
 * Thin dispatcher over the AIProvider abstraction. Provider selection lives in
 * ./providers; this service only wires SSE streaming and preserves the V1
 * result shape consumed by the eval worker.
 */
export const aiService = {
  async evaluate(params: EvalParams): Promise<EvaluationResult> {
    const channel = `eval:${params.userId}:${params.answerId}`;
    const provider = getAIProvider();
    const result = await provider.evaluate(
      {
        questionId: params.questionId,
        questionText: params.questionText,
        rubricHints: params.rubricHints,
        level: params.level,
        answerText: params.answerText,
      },
      {
        onToken: (delta) => params.hub.publish(channel, { type: "token", delta }),
      },
    );
    return { score: result.score, feedback: result.feedback, modelAnswer: result.modelAnswer };
  },
};
