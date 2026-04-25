import mongoose, { Document, Schema } from "mongoose";

export type QuestionCategory =
  | "DSA"
  | "OS"
  | "DBMS"
  | "Networks"
  | "OOP"
  | "SystemDesign"
  | "Behavioral";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface IQuestion extends Document {
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  text: string;
  rubricHints: string;
}

const QuestionSchema = new Schema<IQuestion>({
  category: {
    type: String,
    enum: ["DSA", "OS", "DBMS", "Networks", "OOP", "SystemDesign", "Behavioral"],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },
  text: { type: String, required: true },
  rubricHints: { type: String, required: true },
});

export const Question = mongoose.model<IQuestion>("Question", QuestionSchema);
