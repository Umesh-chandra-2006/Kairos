import { z } from "zod";
import { USER_ROLES, SKILL_LEVELS } from "../constants";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email").max(320),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  device: z.enum(["web", "mobile"]).optional().default("web"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email").max(320),
  password: z.string().min(1).max(128),
  device: z.enum(["web", "mobile"]).optional().default("web"),
});

export const refreshSchema = z.object({
  device: z.enum(["web", "mobile"]).optional().default("web"),
  refreshToken: z.string().min(10).max(512).optional(),
});

export const onboardingSchema = z.object({
  role: z.enum(USER_ROLES),
  level: z.enum(SKILL_LEVELS),
  targets: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  notificationTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format"),
  timezone: z.string().min(1).max(64).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email").max(320),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10).max(512),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(512),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const userProfileSchema = z.object({
  role: z.enum(USER_ROLES),
  level: z.enum(SKILL_LEVELS),
  targets: z.array(z.string()),
  notificationTime: z.string(),
  timezone: z.string().optional(),
});

export const publicUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  profile: userProfileSchema.nullable(),
  createdAt: z.string(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number().int(),
  refreshToken: z.string().optional(),
  user: publicUserSchema,
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
