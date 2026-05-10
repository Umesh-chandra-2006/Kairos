/**
 * Shared API type definitions
 * Single source of truth for client-server contracts
 */

// Database entity types
export interface Question {
  id: number;
  category: "DSA" | "OS" | "DBMS" | "Networks" | "OOP" | "SystemDesign" | "Behavioral" | "FullStack" | "Frontend" | "Backend" | "HR" | "Cloud" | "Security" | "Testing" | "DevOps" | "Mobile" | "MachineLearning" | "Agile" | "Product";
  difficulty: "easy" | "medium" | "hard";
  text: string;
  rubricHints: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Answer {
  id: number;
  userId: number;
  questionId: number;
  date: string;
  answerText: string;
  score: number;
  feedback: string;
  modelAnswer: string;
  createdAt: Date;
  updatedAt: Date;
  question?: Question;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  profileRole?: "student" | "professional";
  profileLevel?: "beginner" | "intermediate" | "advanced";
  profileTargets?: string[];
  notificationTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Streak {
  id: number;
  userId: number;
  current: number;
  longest: number;
  lastActiveDate?: string;
  freezesRemaining: number;
  lastFreezeRefill?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types
export interface GetTodayQuestionResponse {
  question: Question;
  answer?: Answer;
  alreadyAnswered: boolean;
}

export interface SubmitAnswerResponse {
  score: number;
  feedback: string;
  modelAnswer: string;
  streak: {
    current: number;
    longest: number;
  };
}

export interface GetAnswerHistoryResponse {
  answers: Answer[];
  count: number;
}

export interface GetStreakResponse {
  current: number;
  longest: number;
  lastActiveDate?: string;
  freezesRemaining: number;
}



export interface OnboardingResponse {
  success: boolean;
}

export interface ErrorResponse {
  error: string;
  errorId?: string;
  details?: any[];
  stack?: string;
}
