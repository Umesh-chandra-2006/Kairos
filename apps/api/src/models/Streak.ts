import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStreak extends Document {
  userId: Types.ObjectId;
  current: number;
  longest: number;
  lastActiveDate: string; // "YYYY-MM-DD"
  freezesRemaining: number;
  lastFreezeRefill: string; // "YYYY-MM-DD" — tracks Monday refills
}

const StreakSchema = new Schema<IStreak>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  current: { type: Number, default: 0 },
  longest: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: "" },
  freezesRemaining: { type: Number, default: 1 },
  lastFreezeRefill: { type: String, default: "" },
});

export const Streak = mongoose.model<IStreak>("Streak", StreakSchema);
