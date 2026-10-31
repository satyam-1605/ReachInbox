import { Router } from "express";
import { emailsRouter } from "../modules/emails/emails.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { slackRouter } from "../modules/slack/slack.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/slack", slackRouter);
apiRouter.use("/auth/slack", slackRouter);
apiRouter.use("/emails", emailsRouter);

