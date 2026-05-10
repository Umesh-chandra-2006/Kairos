import mongoose, { Document, Schema } from "mongoose";

export interface IUserProfile {
  role: "student" | "professional" | null;
  level: "beginner" | "intermediate" | "advanced" | null;
  targets: string[];
  notificationTime: string;
}

export interface IUser extends Document {
  clerkId: string;
  name: string;
  email: string;
  profile: IUserProfile;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    profile: {
      role: { type: String, enum: ["student", "professional"], default: null },
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: null,
      },
      targets: { type: [String], default: [] },
      notificationTime: { type: String, default: "09:00" },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
