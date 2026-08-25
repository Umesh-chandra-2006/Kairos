import { Router } from "express";
import { getDb } from "@kairos/db";
import { practiceQuerySchema, questionFiltersSchema } from "@kairos/shared";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { questionService } from "../services/question.service";

export const questionsRouter: Router = Router();

questionsRouter.use(requireAuth);

questionsRouter.get(
  "/today",
  asyncHandler(async (req, res) => {
    const db = getDb();
    res.json(await questionService.today(db, req.userId!));
  }),
);

questionsRouter.get(
  "/practice",
  validate(practiceQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { category } = req.query as unknown as { category?: string };
    res.json({ question: await questionService.practice(db, category, req.userId!) });
  }),
);

questionsRouter.get(
  "/",
  validate(questionFiltersSchema, "query"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    res.json(await questionService.list(db, req.query as never));
  }),
);
