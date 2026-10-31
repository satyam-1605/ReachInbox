import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import { prisma } from "../../config/db.js";

export function getGoogleOAuthClient(): OAuth2Client {
  const redirectUri = env.GOOGLE_CALLBACK_URL || `http://localhost:${env.PORT}/auth/google/callback`;
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function generateGoogleAuthUrl(): string {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export async function verifyAndExtractGoogleProfile(
  code: string
): Promise<GoogleUserProfile> {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  if (!tokens.id_token) {
    throw new Error("Missing ID token from Google OAuth response");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Unable to retrieve user details from Google ID token");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    avatar: payload.picture,
  };
}

export async function upsertGoogleUser(profile: GoogleUserProfile) {
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      name: profile.name,
      avatar: profile.avatar,
      googleId: profile.googleId,
    },
    create: {
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      googleId: profile.googleId,
    },
  });

  // Ensure user has at least one sender record
  const existingSender = await prisma.sender.findFirst({
    where: { userId: user.id },
  });

  if (!existingSender) {
    await prisma.sender.create({
      data: {
        userId: user.id,
        name: user.name || "Default Sender",
        email: user.email,
      },
    });
  }

  return user;
}

