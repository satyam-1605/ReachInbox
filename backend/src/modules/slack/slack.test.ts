import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../config/db.js";
import {
  generateSlackOAuthUrl,
  sendSlackRateLimitAlert,
  getSlackStatus,
} from "./slack.service.js";
import { getDefaultUserAndSender } from "../senders/senders.service.js";
import { generateAuthToken, AUTH_COOKIE_NAME } from "../auth/auth.token.js";

describe("Slack OAuth & Rate Limit Alert (Step 10)", () => {
  let testUserId: string;

  beforeAll(async () => {
    const defaultData = await getDefaultUserAndSender();
    testUserId = defaultData.user.id;
    // Clean up any existing connection for this user
    await prisma.slackConnection.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterAll(async () => {
    await prisma.slackConnection.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.$disconnect();
  });

  describe("Slack OAuth URL", () => {
    it("should generate a valid Slack OAuth URL with required scopes", () => {
      const url = generateSlackOAuthUrl(testUserId);
      expect(url).toContain("slack.com/oauth/v2/authorize");
      expect(url).toContain("client_id=");
      expect(url).toContain("chat%3Awrite");
      expect(url).toContain(`state=${testUserId}`);
    });
  });

  describe("Slack Alert Dispatching", () => {
    it("should skip silently without error when Slack is not connected", async () => {
      // Ensure user has no Slack connection
      await prisma.slackConnection.deleteMany({ where: { userId: testUserId } });

      const result = await sendSlackRateLimitAlert(
        "Default Sender",
        "sender@ethereal.email",
        "2026-10-30-10",
        testUserId
      );

      expect(result.sent).toBe(false);
      expect(result.reason).toBe("slack_not_connected");
    });

    it("should make a real Slack API call when Slack is connected", async () => {
      // 1. Create a connected Slack record for the user
      await prisma.slackConnection.upsert({
        where: { userId: testUserId },
        update: {
          accessToken: "xoxb-test-mock-slack-token-12345",
          channelId: "C12345678",
          teamId: "T12345678",
        },
        create: {
          userId: testUserId,
          accessToken: "xoxb-test-mock-slack-token-12345",
          channelId: "C12345678",
          teamId: "T12345678",
        },
      });

      // 2. Intercept global fetch to verify the Slack API call payload
      let capturedPayload: any = null;
      let capturedAuthHeader: string | null = null;

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
        if (url.includes("slack.com/api/chat.postMessage")) {
          capturedAuthHeader = init.headers.Authorization;
          capturedPayload = JSON.parse(init.body);
          return {
            json: async () => ({ ok: true, channel: "C12345678", ts: "1234567890.123456" }),
          } as Response;
        }
        return originalFetch(url, init);
      });

      try {
        const result = await sendSlackRateLimitAlert(
          "Marketing Team",
          "marketing@company.com",
          "2026-10-30-11",
          testUserId
        );

        expect(result.sent).toBe(true);
        expect(capturedAuthHeader).toBe("Bearer xoxb-test-mock-slack-token-12345");
        expect(capturedPayload).toBeDefined();
        expect(capturedPayload.channel).toBe("C12345678");
        expect(capturedPayload.text).toContain("Marketing Team");
        expect(capturedPayload.text).toContain("2026-10-30-11");
        expect(capturedPayload.text).toContain("Rate Limit");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("GET /slack/status and POST /slack/disconnect", () => {
    it("should return connection status for authenticated user", async () => {
      const token = generateAuthToken(testUserId);
      const res = await request(app)
        .get("/slack/status")
        .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.channelId).toBe("C12345678");
    });

    it("should disconnect Slack connection on POST /slack/disconnect", async () => {
      const token = generateAuthToken(testUserId);
      const res = await request(app)
        .post("/slack/disconnect")
        .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Slack disconnected successfully");

      const check = await getSlackStatus(testUserId);
      expect(check.connected).toBe(false);
    });
  });
});
