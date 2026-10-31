import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_DB: z.coerce.number().default(0),
  WORKER_CONCURRENCY: z.coerce.number().default(2),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(3),
  MAX_HOURLY_LIMIT_CAP: z.coerce.number().default(100),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().default("placeholder_client_id"),
  GOOGLE_CLIENT_SECRET: z.string().default("placeholder_client_secret"),
  GOOGLE_CALLBACK_URL: z.string().default("http://localhost:4000/auth/google/callback"),
  SESSION_SECRET: z.string().default("placeholder_session_secret"),
  SLACK_CLIENT_ID: z.string().default("placeholder_slack_client_id"),
  SLACK_CLIENT_SECRET: z.string().default("placeholder_slack_client_secret"),
  SLACK_REDIRECT_URI: z.string().default("http://localhost:4000/auth/slack/callback"),
  ELASTICSEARCH_NODE: z.string().default("http://localhost:9200"),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);

