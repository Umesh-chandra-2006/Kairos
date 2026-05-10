import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAnswer extends Document {
  userId: Types.ObjectId;
  questionId: Types.ObjectId;
  date: string; // "YYYY-MM-DD" — NOT a Date object
  answerText: string;
  score: number;
  feedback: string;
  modelAnswer: string;
  createdAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    answerText: { type: String, required: true },
    score: { type: Number, required: true, min: 1, max: 10 },
    feedback: { type: String, required: true },
    modelAnswer: { type: String, required: true },
  },
  { timestamps: true }
);

// Compound index: one answer per user per day
AnswerSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Answer = mongoose.model<IAnswer>("Answer", AnswerSchema);
