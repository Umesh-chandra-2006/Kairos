import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import net from "net";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { connectDB } from "../lib/db";
import authRoutes from "../routes/auth";
import questionRoutes from "../routes/question";
import answerRoutes from "../routes/answer";
import streakRoutes from "../routes/streak";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Centralized error handler
const errorHandler = (
  error: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || "Internal server error";
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  res.status(statusCode).json({
    error: message,
    errorId: process.env.NODE_ENV !== "production" ? errorId : undefined,
    ...(process.env.NODE_ENV !== "production" && {
      stack: error.stack,
    }),
  });
};

async function startServer() {
  // Connect to database
  try {
    await connectDB();
  } catch (error) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  });

  const answerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 2, // limit each user to 2 answer submissions per hour (1 per day + buffer)
    message: "Answer submission rate limit exceeded",
    skip: (req) => req.method !== "POST",
  });

  app.use("/api", apiLimiter);
  app.use("/api/answer/submit", answerLimiter);

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/question", questionRoutes);
  app.use("/api/answer", answerRoutes);
  app.use("/api/streak", streakRoutes);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Static files (development or production)
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handler - must be last
  app.use(errorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`✓ API running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
