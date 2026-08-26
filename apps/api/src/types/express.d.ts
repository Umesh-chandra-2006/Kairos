import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: "user" | "admin" | "tpo";
      collegeId?: string;
    }
  }
}

export {};
