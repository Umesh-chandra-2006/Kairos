import { Router } from "express";
import { answersRouter } from "./answers.routes";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { leaderboardRouter } from "./leaderboard.routes";
import { notificationsRouter } from "./notifications.routes";
import { questionsRouter } from "./questions.routes";
import { streaksRouter } from "./streaks.routes";

export const apiRouter: Router = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/questions", questionsRouter);
apiRouter.use("/answers", answersRouter);
apiRouter.use("/streak", streaksRouter);
apiRouter.use("/leaderboard", leaderboardRouter);
apiRouter.use("/notifications", notificationsRouter);
