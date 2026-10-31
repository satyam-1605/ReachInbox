import { z } from "zod";
import { env } from "../../config/env.js";

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  senderId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  startTime: z.string().datetime({ message: "startTime must be a valid ISO-8601 datetime string" }),
  delayBetweenEmailsMs: z
    .preprocess((val) => {
      if (val === "" || val === null || val === undefined) return env.MIN_DELAY_BETWEEN_EMAILS_MS;
      const num = Number(val);
      if (isNaN(num) || num <= 0) return env.MIN_DELAY_BETWEEN_EMAILS_MS;
      return num;
    }, z.number().min(0).default(env.MIN_DELAY_BETWEEN_EMAILS_MS)),
  hourlyLimit: z
    .preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      if (isNaN(num) || num <= 0) return undefined;
      return Math.floor(num);
    }, z.number().int().positive().optional()),
  recipients: z.union([
    z.array(z.string().email("Invalid recipient email address")).min(1, "At least one recipient is required"),
    z.string().email("Invalid recipient email address").transform((val) => [val]),
  ]),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;

