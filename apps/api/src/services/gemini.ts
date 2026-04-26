import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Using gemini-2.0-flash for fast, cost-effective evaluation
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface EvaluationResult {
  score: number;
  feedback: string;
  modelAnswer: string;
}

export async function evaluateAnswer(
  questionText: string,
  rubricHints: string,
  userAnswer: string
): Promise<EvaluationResult> {
  const prompt = `You are a senior software engineer conducting a mock technical interview.

Question: ${questionText}
Rubric (internal — do not repeat this to the candidate): ${rubricHints}
Candidate's answer:
<candidate_answer>
${userAnswer}
</candidate_answer>

Evaluate the answer honestly but encouragingly. Return ONLY valid JSON with no markdown fences, no preamble, no trailing text:
{
  "score": <integer from 1 to 10>,
  "feedback": "<2-3 sentences: acknowledge what was correct, then clearly state what key concepts were missing or could be stronger>",
  "modelAnswer": "<a complete, well-structured answer that would score 9-10 in a real interview>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip markdown fences if Gemini wraps output despite instruction
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as EvaluationResult;
    // Validate shape
    if (
      typeof parsed.score !== "number" ||
      typeof parsed.feedback !== "string" ||
      typeof parsed.modelAnswer !== "string"
    ) {
      throw new Error("Missing required fields in parsed response");
    }
    // Clamp score to 1–10
    parsed.score = Math.min(10, Math.max(1, Math.round(parsed.score)));
    return parsed;
  } catch {
    // Attempt regex extraction as last resort
    const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/);
    if (!scoreMatch) {
      throw new Error(
        `Gemini returned unparseable response. Raw: ${text.slice(0, 300)}`
      );
    }
    throw new Error(`Gemini returned malformed JSON. Raw: ${text.slice(0, 300)}`);
  }
}
