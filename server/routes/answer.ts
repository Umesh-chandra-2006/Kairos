import { Router, Request, Response } from "express";
import { format } from "date-fns";
import { getDB } from "../lib/db";
import { answers, questions, streaks } from "../../drizzle/schema";
import { evaluateAnswer } from "../services/claude";
import { updateStreakOnAnswer } from "../services/streak";
import { requireAuth } from "../middleware/requireAuth";
import { submitAnswerSchema, getAnswerHistorySchema } from "../validations";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// POST /api/answer/submit
router.post("/submit", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate input
    const validationResult = submitAnswerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.flatten(),
      });
    }

    const { questionId, answerText } = validationResult.data;
    const db = getDB();
    const today = getToday();

    // Parse questionId to number if string
    const qId = typeof questionId === "string" ? parseInt(questionId) : questionId;

    // Atomic check: Try to insert answer. If it fails due to unique constraint (userId, date),
    // user already answered today
    try {
      const question = await db.query.questions.findFirst({
        where: eq(questions.id, qId),
      });

      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      // Call Claude for evaluation
      let evaluation;
      try {
        evaluation = await evaluateAnswer(question.text, question.rubricHints, answerText);
      } catch (error) {
        console.error("Claude evaluation error:", error);
        return res.status(500).json({
          error: "Evaluation failed. Try again.",
          ...(process.env.NODE_ENV !== "production" && {
            details: error instanceof Error ? error.message : "Unknown error"
          }),
        });
      }

      // Insert answer - will fail if user already answered today due to unique constraint
      const [newAnswer] = await db
        .insert(answers)
        .values({
          userId,
          questionId: qId,
          date: today,
          answerText,
          score: evaluation.score,
          feedback: evaluation.feedback,
          modelAnswer: evaluation.modelAnswer,
        });

      // Update streak
      const updatedStreak = await updateStreakOnAnswer(userId);

      res.json({
        score: evaluation.score,
        feedback: evaluation.feedback,
        modelAnswer: evaluation.modelAnswer,
        streak: {
          current: updatedStreak.current,
          longest: updatedStreak.longest,
        },
      });
    } catch (insertError: any) {
      // Check if it's a unique constraint violation (already answered today)
      if (insertError.code === "ER_DUP_ENTRY" || insertError.message?.includes("UNIQUE")) {
        return res.status(400).json({ error: "Already answered today" });
      }
      throw insertError;
    }
  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({
      error: "Failed to submit answer",
      ...(process.env.NODE_ENV !== "production" && {
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    });
  }
});

// GET /api/answer/history
router.get("/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate query params
    const validationResult = getAnswerHistorySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.flatten(),
      });
    }

    const { limit, offset } = validationResult.data;
    const db = getDB();

    const userAnswers = await db.query.answers.findMany({
      where: eq(answers.userId, userId),
      orderBy: (answers, { desc }) => [desc(answers.createdAt)],
      limit,
      offset,
      with: {
        question: true,
      },
    });

    res.json({ 
      answers: userAnswers,
      count: userAnswers.length,
    });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({
      error: "Failed to fetch history",
      ...(process.env.NODE_ENV !== "production" && {
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    });
  }
});

export default router;
