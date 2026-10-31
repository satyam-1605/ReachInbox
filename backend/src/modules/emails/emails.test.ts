import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../config/db.js";
import { emailQueue } from "../../queue/emailQueue.js";
import { redisConnection } from "../../queue/redis.js";

describe("Emails API and Producer (Step 3)", () => {
  beforeAll(async () => {
    // Clean up test emails from previous runs
    await prisma.email.deleteMany();
    await emailQueue.drain();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await emailQueue.close();
    await redisConnection.quit();
  });

  describe("POST /emails/schedule Validation", () => {
    it("should return 400 when required fields are missing", async () => {
      const res = await request(app).post("/emails/schedule").send({
        // missing subject, body, startTime, recipients
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toBeDefined();
    });

    it("should return 400 when recipient email is invalid", async () => {
      const res = await request(app).post("/emails/schedule").send({
        subject: "Hello",
        body: "Test Body",
        startTime: new Date().toISOString(),
        recipients: ["not-an-email"],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("POST /emails/schedule Execution", () => {
    it("should save email in DB and create BullMQ delayed job with jobId = emailId", async () => {
      const startTime = new Date(Date.now() + 60000).toISOString(); // 1 minute in future

      const res = await request(app)
        .post("/emails/schedule")
        .send({
          subject: "Welcome Lead!",
          body: "Excited to connect.",
          startTime,
          delayBetweenEmailsMs: 2000,
          recipients: ["lead1@example.com", "lead2@example.com"],
        });

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(2);
      expect(res.body.emails).toHaveLength(2);

      const [email1, email2] = res.body.emails;

      // Verify in DB
      const dbEmail1 = await prisma.email.findUnique({ where: { id: email1.id } });
      const dbEmail2 = await prisma.email.findUnique({ where: { id: email2.id } });

      expect(dbEmail1).toBeDefined();
      expect(dbEmail1?.status).toBe("SCHEDULED");
      expect(dbEmail1?.recipient).toBe("lead1@example.com");

      expect(dbEmail2).toBeDefined();
      expect(dbEmail2?.status).toBe("SCHEDULED");
      expect(dbEmail2?.recipient).toBe("lead2@example.com");

      // Verify delayed jobs in BullMQ Redis queue
      const job1 = await emailQueue.getJob(email1.id);
      const job2 = await emailQueue.getJob(email2.id);

      expect(job1).toBeDefined();
      expect(job1?.id).toBe(email1.id);
      expect(job1?.data.recipient).toBe("lead1@example.com");
      expect(job1?.data.subject).toBe("Welcome Lead!");
      expect(job1?.delay).toBeGreaterThan(0);

      expect(job2).toBeDefined();
      expect(job2?.id).toBe(email2.id);
      expect(job2?.data.recipient).toBe("lead2@example.com");
      // job2 has an extra 2000ms delay compared to job1
      expect(job2!.delay).toBeGreaterThan(job1!.delay);
    });

    it("should enforce idempotency: same jobId cannot be queued twice", async () => {
      const email = await prisma.email.findFirst();
      expect(email).toBeDefined();

      // Trying to add job with same ID should not duplicate it
      const existingJob = await emailQueue.getJob(email!.id);
      expect(existingJob).toBeDefined();

      // Attempt to add duplicate job with same jobId
      await emailQueue.add(
        "sendEmail",
        {
          emailId: email!.id,
          senderId: email!.senderId,
          recipient: email!.recipient,
          subject: email!.subject,
          body: email!.body,
        },
        { jobId: email!.id }
      );

      // BullMQ deduplicates jobs by jobId
      const jobs = await emailQueue.getJobs(["delayed", "waiting"]);
      const duplicates = jobs.filter((j) => j.id === email!.id);
      expect(duplicates.length).toBe(1);
    });
  });

  describe("GET /emails/scheduled and GET /emails/sent", () => {
    it("should return scheduled emails list", async () => {
      const res = await request(app).get("/emails/scheduled");
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(res.body.emails)).toBe(true);
      expect(res.body.emails[0].status).toBe("SCHEDULED");
    });

    it("should return sent emails list", async () => {
      const res = await request(app).get("/emails/sent");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.emails)).toBe(true);
      expect(res.body.count).toBe(0); // None sent yet in Step 3
    });
  });
});

