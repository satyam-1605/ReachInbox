import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../config/db.js";
import { upsertGoogleUser, generateGoogleAuthUrl } from "./googleOAuth.service.js";
import { generateAuthToken, AUTH_COOKIE_NAME } from "./auth.token.js";

describe("Google OAuth & Auth Sessions (Step 9)", () => {
  const testGoogleProfile = {
    googleId: "google-uid-test-12345",
    email: "sarah.lead@gmail.com",
    name: "Sarah Lead",
    avatar: "https://lh3.googleusercontent.com/a/test-avatar",
  };

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testGoogleProfile.email },
    });
    await prisma.$disconnect();
  });

  describe("GET /auth/me Access Control", () => {
    it("should return 401 Unauthorized when no auth token/cookie is provided", async () => {
      const res = await request(app).get("/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authentication required");
    });

    it("should return 401 Unauthorized when an invalid token is provided", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-jwt-token");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid or expired session token");
    });
  });

  describe("GET /auth/google Redirect URL", () => {
    it("should generate and redirect to a valid Google OAuth URL", async () => {
      const res = await request(app).get("/auth/google");
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("accounts.google.com");
      expect(res.headers.location).toContain("response_type=code");
    });

    it("should include necessary profile and email scopes in generated URL", () => {
      const url = generateGoogleAuthUrl();
      expect(url).toContain("accounts.google.com");
      expect(url).toContain("scope=");
    });
  });

  describe("Authenticated User Profile & Logout Flow", () => {
    it("should return user details (name, email, avatar) when authenticated with session", async () => {
      // 1. Upsert user in Postgres DB
      const user = await upsertGoogleUser(testGoogleProfile);
      expect(user.id).toBeDefined();
      expect(user.email).toBe(testGoogleProfile.email);
      expect(user.name).toBe(testGoogleProfile.name);
      expect(user.avatar).toBe(testGoogleProfile.avatar);

      // 2. Generate token and call /auth/me with cookie
      const token = generateAuthToken(user.id);
      const res = await request(app)
        .get("/auth/me")
        .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.email).toBe(testGoogleProfile.email);
      expect(res.body.user.name).toBe(testGoogleProfile.name);
      expect(res.body.user.avatar).toBe(testGoogleProfile.avatar);
    });

    it("should clear session cookie on logout", async () => {
      const res = await request(app).post("/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out successfully");

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      // Cookie is cleared / expired
      expect(cookies[0]).toMatch(/reachinbox_token=;/);
    });
  });
});

