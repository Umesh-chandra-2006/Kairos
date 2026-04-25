import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { User } from "../models/User";
import { Question } from "../models/Question";
import { Answer } from "../models/Answer";
import { evaluateAnswer } from "../services/gemini";
import { updateStreakOnAnswer } from "../services/streak";

const router = Router();

router.use(requireAuth);

// POST /api/answer/submit
router.post("/submit", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questionId, answerText } = req.body as {
      questionId: string;
      answerText: string;
    };

    if (!questionId || !answerText) {
      res.status(400).json({ error: "questionId and answerText are required" });
      return;
    }

    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    // Block double submission
    const existing = await Answer.findOne({ userId: user._id, date: today });
    if (existing) {
      res.status(400).json({ error: "Already answered today" });
      return;
    }

    const question = await Question.findById(questionId);
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    // Call Gemini — if this fails, we do NOT save the Answer
    let evaluation;
    try {
      evaluation = await evaluateAnswer(question.text, question.rubricHints, answerText);
    } catch (err) {
      console.error("Gemini evaluation failed:", err);
      res.status(500).json({ error: "Evaluation failed. Try again." });
      return;
    }

    // Save answer
    const answer = await Answer.create({
      userId: user._id,
      questionId: question._id,
      date: today,
      answerText,
      score: evaluation.score,
      feedback: evaluation.feedback,
      modelAnswer: evaluation.modelAnswer,
    });

    // Update streak
    const streak = await updateStreakOnAnswer(String(user._id));

    res.status(200).json({
      score: evaluation.score,
      feedback: evaluation.feedback,
      modelAnswer: evaluation.modelAnswer,
      answerId: answer._id,
      streak: {
        current: streak.current,
        longest: streak.longest,
      },
    });
  } catch (err) {
    throw err;
  }
});

// GET /api/answer/history
router.get("/history", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const answers = await Answer.find({ userId: user._id })
      .populate("questionId")
      .sort({ createdAt: -1 });

    res.status(200).json({ answers });
  } catch (err) {
    throw err;
  }
});

export default router;
