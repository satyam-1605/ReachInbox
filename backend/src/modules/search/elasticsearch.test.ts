import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import {
  initElasticsearch,
  indexEmail,
  updateEmailInIndex,
  searchEmails,
  esClient,
  EMAILS_INDEX,
} from "./elasticsearch.js";
import { prisma } from "../../config/db.js";

describe("Elasticsearch Indexing & Search (Step 7)", () => {
  const testEmailId = "es-test-email-" + Date.now();
  const testRecipient = "founder@startupxyz.com";
  const testSubject = "Exclusive Partnership Proposal for AI Scheduling";
  const testBody = "Hello founder, we would love to collaborate on your tech stack.";

  beforeAll(async () => {
    await initElasticsearch();
  });

  afterAll(async () => {
    // Clean up test document
    try {
      await esClient.delete({
        index: EMAILS_INDEX,
        id: testEmailId,
      });
    } catch {
      // Ignore if not found
    }
    await prisma.$disconnect();
  });

  it("should index an email document into Elasticsearch", async () => {
    await indexEmail({
      id: testEmailId,
      userId: "user-123",
      senderId: "sender-456",
      recipient: testRecipient,
      subject: testSubject,
      body: testBody,
      status: "SCHEDULED",
      scheduledAt: new Date().toISOString(),
      sentAt: null,
      createdAt: new Date().toISOString(),
    });

    const doc = await esClient.get({
      index: EMAILS_INDEX,
      id: testEmailId,
    });

    expect(doc.found).toBe(true);
    expect((doc._source as any).subject).toBe(testSubject);
    expect((doc._source as any).status).toBe("SCHEDULED");
  });

  it("should search and find email by subject keywords", async () => {
    const results = await searchEmails("Partnership Proposal");
    expect(results.total).toBeGreaterThanOrEqual(1);

    const match = results.emails.find((e) => e.id === testEmailId);
    expect(match).toBeDefined();
    expect(match?.recipient).toBe(testRecipient);
  });

  it("should search and find email by recipient address", async () => {
    const results = await searchEmails("startupxyz.com");
    expect(results.total).toBeGreaterThanOrEqual(1);

    const match = results.emails.find((e) => e.id === testEmailId);
    expect(match).toBeDefined();
  });

  it("should update email status in index when email is sent", async () => {
    const sentTime = new Date();
    await updateEmailInIndex(testEmailId, "SENT", sentTime);

    const doc = await esClient.get({
      index: EMAILS_INDEX,
      id: testEmailId,
    });

    expect((doc._source as any).status).toBe("SENT");
    expect((doc._source as any).sentAt).toBe(sentTime.toISOString());
  });

  it("should return search results via API endpoint GET /emails/search", async () => {
    const res = await request(app).get("/emails/search?q=Partnership");
    expect(res.status).toBe(200);
    expect(res.body.query).toBe("Partnership");
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.emails)).toBe(true);
  });
});

