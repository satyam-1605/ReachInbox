import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export const AUTH_COOKIE_NAME = "reachinbox_token";

export interface TokenPayload {
  userId: string;
}

export function generateAuthToken(userId: string): string {
  return jwt.sign({ userId }, env.SESSION_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyAuthToken(token: string): TokenPayload {
  return jwt.verify(token, env.SESSION_SECRET) as TokenPayload;
}

