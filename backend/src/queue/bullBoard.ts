import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./emailQueue.js";
import { env } from "../config/env.js";

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    // Constant-time execution to prevent timing attack on length mismatch
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function bullBoardAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If credentials are not set (e.g. in development), allow access
  if (!env.BULL_BOARD_USER || !env.BULL_BOARD_PASS) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
    return res.status(401).send("Authentication required");
  }

  const base64Credentials = authHeader.substring(6).trim();
  const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const colonIndex = decoded.indexOf(":");

  if (colonIndex === -1) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
    return res.status(401).send("Invalid authorization format");
  }

  const username = decoded.substring(0, colonIndex);
  const password = decoded.substring(colonIndex + 1);

  const isUserValid = safeCompare(username, env.BULL_BOARD_USER);
  const isPassValid = safeCompare(password, env.BULL_BOARD_PASS);

  if (isUserValid && isPassValid) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
  return res.status(401).send("Unauthorized");
}

export const bullBoardRouter = serverAdapter.getRouter();
