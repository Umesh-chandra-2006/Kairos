import { Router, Request, Response } from "express";
import { getDB } from "../lib/db";
import { questions, answers } from "../../drizzle/schema";
import { requireAuth } from "../middleware/requireAuth";
import { eq, sql, and, not, inArray, notInArray } from "drizzle-orm";

const router = Router();

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// GET /api/question/today
router.get("/today", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();
    const todayStr = getToday();

    // 1. Check if user already answered today
    const todayAnswer = await db.query.answers.findFirst({
      where: and(eq(answers.userId, userId), eq(answers.date, todayStr)),
      with: { question: true },
    });

    if (todayAnswer) {
      return res.json({
        question: todayAnswer.question,
        answer: todayAnswer,
        alreadyAnswered: true,
      });
    }

    // 2. Pick the daily question deterministically for the whole server
    // We use the date as a seed to pick from the total pool of questions
    const allQuestions = await db.query.questions.findMany();
    if (allQuestions.length === 0) {
      return res.status(404).json({ error: "No questions in database" });
    }

    // Simple deterministic hash of the date string
    const dateSeed = todayStr.split("-").reduce((acc, val) => acc + parseInt(val), 0);
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Combine year and day of year for a unique daily index
    const year = new Date().getFullYear();
    const seed = year * 1000 + dayOfYear;
    
    // Pick question
    const selectedQuestion = allQuestions[seed % allQuestions.length];

    res.json({
      question: selectedQuestion,
      alreadyAnswered: false,
    });
  } catch (error) {
    console.error("Today question error:", error);
    res.status(500).json({ error: "Failed to fetch daily question" });
  }
});

// GET /api/question/practice
router.get("/practice", requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const db = getDB();

    let query: any = {};
    if (category) {
      query.where = eq(questions.category, category as any);
    }

    const availableQuestions = await db.query.questions.findMany(query);
    if (availableQuestions.length === 0) {
      return res.status(404).json({ error: "No questions found for this category" });
    }

    const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    res.json({ question: randomQuestion });
  } catch (error) {
    console.error("Practice question error:", error);
    res.status(500).json({ error: "Failed to fetch practice question" });
  }
});

// GET /api/question/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const question = await db.query.questions.findFirst({
      where: eq(questions.id, parseInt(id)),
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({ question });
  } catch (error) {
    console.error("Fetch question error:", error);
    res.status(500).json({ error: "Failed to fetch question" });
  }
});

export default router;
