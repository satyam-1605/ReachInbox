import { Router } from "express";
import {
  googleLoginHandler,
  googleCallbackHandler,
  getMeHandler,
  logoutHandler,
} from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

export const authRouter = Router();

authRouter.get("/google", googleLoginHandler);
authRouter.get("/google/callback", googleCallbackHandler);
authRouter.get("/me", requireAuth, getMeHandler);
authRouter.post("/logout", logoutHandler);

