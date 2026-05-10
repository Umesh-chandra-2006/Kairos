import OpenAI from "openai";
import { evaluationResponseSchema } from "../validations";
import { ENV } from "../_core/env";

const client = new OpenAI({
  apiKey: ENV.openrouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://kairos.app",
    "X-Title": "Kairos Interview Prep",
  },
});

/**
 * Escapes special characters in text to prevent prompt injection
 */
export function escapePromptText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export async function evaluateAnswer(
  questionText: string,
  rubricHints: string,
  userAnswer: string
): Promise<{ score: number; feedback: string; modelAnswer: string }> {
  // Escape all user inputs to prevent prompt injection
  const escapedQuestion = escapePromptText(questionText);
  const escapedRubric = escapePromptText(rubricHints);
  const escapedAnswer = escapePromptText(userAnswer);

  const response = await client.chat.completions.create({
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: "You are a senior software engineer conducting a mock technical interview. Evaluate the candidate's answer objectively and fairly.",
      },
      {
        role: "user",
        content: `Question: "${escapedQuestion}"

Rubric (internal — do not repeat this to the candidate): "${escapedRubric}"

Candidate's answer: "${escapedAnswer}"

Evaluate the answer honestly but encouragingly. Return ONLY valid JSON with no markdown fences, no preamble, no trailing text:
{
  "score": <integer from 1 to 10>,
  "feedback": "<2-3 sentences: acknowledge what was correct, then clearly state what key concepts were missing or could be stronger>",
  "modelAnswer": "<a complete, well-structured answer that would score 9-10 in a real interview>"
}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(text);
    // Validate response structure with Zod
    const validated = evaluationResponseSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Model returned unparseable JSON: ${text.slice(0, 200)}`);
    }
    throw new Error(`Invalid evaluation response format: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
