import { Router } from "express";
import {
  scheduleHandler,
  getScheduledHandler,
  getSentHandler,
  searchHandler,
} from "./emails.controller.js";
import { optionalAuth } from "../auth/auth.middleware.js";

export const emailsRouter = Router();

emailsRouter.post("/schedule", optionalAuth, scheduleHandler);
emailsRouter.get("/scheduled", optionalAuth, getScheduledHandler);
emailsRouter.get("/sent", optionalAuth, getSentHandler);
emailsRouter.get("/search", optionalAuth, searchHandler);

