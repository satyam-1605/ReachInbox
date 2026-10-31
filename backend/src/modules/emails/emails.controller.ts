import { Request, Response, NextFunction } from "express";
import { scheduleEmailSchema } from "./emails.validation.js";
import * as emailsService from "./emails.service.js";
import { searchEmails } from "../search/elasticsearch.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";

export async function scheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parseResult = scheduleEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.errors,
      });
    }

    const payload = { ...parseResult.data };
    const authReq = req as AuthenticatedRequest;
    if (!payload.userId && authReq.user?.id) {
      payload.userId = authReq.user.id;
    }

    const scheduled = await emailsService.scheduleEmails(payload);
    return res.status(201).json({
      message: "Emails scheduled successfully",
      count: scheduled.length,
      emails: scheduled,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getScheduledHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const emails = await emailsService.getScheduledEmails(userId);
    return res.json({
      count: emails.length,
      emails,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const emails = await emailsService.getSentEmails(userId);
    return res.json({
      count: emails.length,
      emails,
    });
  } catch (error) {
    return next(error);
  }
}

export async function searchHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = (req.query.q as string) || "";
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const results = await searchEmails(q, userId);
    return res.json({
      query: q,
      total: results.total,
      emails: results.emails,
    });
  } catch (error) {
    return next(error);
  }
}

