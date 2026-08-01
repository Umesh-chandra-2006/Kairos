import { z } from "zod";

export const notificationPrefsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  evalNotifications: z.boolean().optional(),
  streakReminder: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format")
    .optional(),
});

export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
