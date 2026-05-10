import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { User } from "../models/User";
import { Question, QuestionCategory } from "../models/Question";
import { Answer } from "../models/Answer";
import { Types } from "mongoose";

const router = Router();

router.use(requireAuth);

// GET /api/question/today
router.get("/today", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if already answered today
    const existingAnswer = await Answer.findOne({
      userId: user._id,
      date: today,
    }).populate("questionId");

    if (existingAnswer) {
      res.status(200).json({
        question: existingAnswer.questionId,
        answer: existingAnswer,
        alreadyAnswered: true,
      });
      return;
    }

    // Get all answered question IDs
    const answeredAnswers = await Answer.find({ userId: user._id }).select("questionId");
    const answeredIds = answeredAnswers.map((a) => a.questionId);

    // Get unanswered questions
    let unansweredQuestions = await Question.find({ _id: { $nin: answeredIds } });

    let selectedQuestion;

    if (unansweredQuestions.length > 0) {
      // Compute avg score per category
      const categoryScores: Record<string, { total: number; count: number }> = {};
      const answeredWithQuestion = await Answer.find({ userId: user._id }).populate<{
        questionId: { category: QuestionCategory };
      }>("questionId");

      for (const ans of answeredWithQuestion) {
        const cat = (ans.questionId as unknown as { category: QuestionCategory }).category;
        if (!categoryScores[cat]) categoryScores[cat] = { total: 0, count: 0 };
        categoryScores[cat].total += ans.score;
        categoryScores[cat].count += 1;
      }

      const allCategories: QuestionCategory[] = [
        "DSA", "OS", "DBMS", "Networks", "OOP", "SystemDesign", "Behavioral",
      ];

      // Find weakest category (unattempted counts as 0 avg)
      let weakestCategory: QuestionCategory | null = null;
      let lowestAvg = Infinity;
      for (const cat of allCategories) {
        const avg = categoryScores[cat]
          ? categoryScores[cat].total / categoryScores[cat].count
          : 0;
        if (avg < lowestAvg) {
          lowestAvg = avg;
          weakestCategory = cat;
        }
      }

      // Try to find unanswered in weakest category
      let pool = unansweredQuestions.filter(
        (q) => q.category === weakestCategory
      );

      // Fall back to all unanswered if none in weakest category
      if (pool.length === 0) pool = unansweredQuestions;

      selectedQuestion = pool[Math.floor(Math.random() * pool.length)];
    } else {
      // All questions answered — re-serve oldest
      const oldest = await Answer.findOne({ userId: user._id })
        .sort({ createdAt: 1 })
        .populate("questionId");
      selectedQuestion = oldest?.questionId;
    }

    if (!selectedQuestion) {
      res.status(404).json({ error: "No questions available" });
      return;
    }

    res.status(200).json({ question: selectedQuestion, alreadyAnswered: false });
  } catch (err) {
    throw err;
  }
});

export default router;
