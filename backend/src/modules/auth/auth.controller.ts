import { Request, Response, NextFunction } from "express";
import {
  generateGoogleAuthUrl,
  verifyAndExtractGoogleProfile,
  upsertGoogleUser,
} from "./googleOAuth.service.js";
import { generateAuthToken, AUTH_COOKIE_NAME } from "./auth.token.js";
import { AuthenticatedRequest } from "./auth.middleware.js";
import { env } from "../../config/env.js";

export function googleLoginHandler(_req: Request, res: Response) {
  const url = generateGoogleAuthUrl();
  return res.redirect(url);
}

export async function googleCallbackHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    const profile = await verifyAndExtractGoogleProfile(code);
    const user = await upsertGoogleUser(profile);
    const token = generateAuthToken(user.id);

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: req.secure,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    return next(error);
  }
}

export function getMeHandler(req: AuthenticatedRequest, res: Response) {
  return res.json({
    user: req.user,
  });
}

export function logoutHandler(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
  });
  return res.json({ message: "Logged out successfully" });
}

