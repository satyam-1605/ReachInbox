import { Request, Response, NextFunction } from "express";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "./auth.token.js";
import { prisma } from "../../config/db.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User session not found" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired session token" });
  }
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const payload = verifyAuthToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      });

      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Optional auth silently continues if token is missing or invalid
  }
  return next();
}

