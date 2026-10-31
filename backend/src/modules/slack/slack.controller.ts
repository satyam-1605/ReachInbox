import { Request, Response, NextFunction } from "express";
import {
  generateSlackOAuthUrl,
  exchangeSlackCodeAndSave,
  getSlackStatus,
  disconnectSlack,
} from "./slack.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { env } from "../../config/env.js";

export function connectHandler(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id || (req.query.userId as string);
  const url = generateSlackOAuthUrl(userId);
  return res.redirect(url);
}

export async function callbackHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing user identification state" });
    }

    await exchangeSlackCodeAndSave(code, userId);
    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (error) {
    return next(error);
  }
}

export async function statusHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const status = await getSlackStatus(userId);
    return res.json(status);
  } catch (error) {
    return next(error);
  }
}

export async function disconnectHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const result = await disconnectSlack(userId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

