import { Router } from "express";
import {
  connectHandler,
  callbackHandler,
  statusHandler,
  disconnectHandler,
} from "./slack.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const slackRouter = Router();

slackRouter.get("/connect", connectHandler);
slackRouter.get("/callback", callbackHandler);
slackRouter.get("/status", requireAuth, statusHandler);
slackRouter.post("/disconnect", requireAuth, disconnectHandler);

