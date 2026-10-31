import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Job } from "bullmq";
import { prisma, EmailStatus } from "../config/db.js";
import { processEmailJob } from "./emailProcessor.js";
import { EmailJobData, emailQueue } from "./emailQueue.js";
import { redisConnection } from "./redis.js";
import { getDefaultUserAndSender } from "../modules/senders/senders.service.js";
import { sendEmailViaEthereal } from "../modules/emails/emailSender.service.js";
import { getHourWindow } from "./rateLimiter.js";

describe("Worker & Ethereal Sending (Step 4)", () => {
  let testUserId: string;
  let testSenderId: string;

  beforeAll(async () => {
    await prisma.email.deleteMany();
    const defaultData = await getDefaultUserAndSender();
    testUserId = defaultData.user.id;
    testSenderId = defaultData.sender.id;

    const window = getHourWindow(new Date());
    await redisConnection.del(`rate:${testSenderId}:${window}`);
  });

  beforeEach(async () => {
    const window = getHourWindow(new Date());
    await redisConnection.del(`rate:${testSenderId}:${window}`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await emailQueue.close();
    await redisConnection.quit();
  });

  it("should send an email through Ethereal and return messageId with previewUrl", async () => {
    const result = await sendEmailViaEthereal({
      fromName: "Test Sender",
      fromEmail: "sender@ethereal.email",
      to: "recipient@example.com",
      subject: "Test Ethereal Delivery",
      body: "This is a live test email sent via Ethereal SMTP.",
    });

    expect(result.messageId).toBeDefined();
    expect(result.previewUrl).toBeDefined();
    expect(result.previewUrl).toContain("ethereal.email");
  }, 15000); // Allow up to 15s for external SMTP test call

  it("should skip processing if email in DB is already marked as SENT (Idempotency)", async () => {
    const alreadySentEmail = await prisma.email.create({
      data: {
        userId: testUserId,
        senderId: testSenderId,
        recipient: "already-sent@example.com",
        subject: "Already Sent Subject",
        body: "Already Sent Body",
        status: EmailStatus.SENT,
        scheduledAt: new Date(),
        sentAt: new Date(),
      },
    });

    const fakeJob = {
      id: alreadySentEmail.id,
      data: {
        emailId: alreadySentEmail.id,
        senderId: testSenderId,
        recipient: alreadySentEmail.recipient,
        subject: alreadySentEmail.subject,
        body: alreadySentEmail.body,
      },
    } as unknown as Job<EmailJobData>;

    const result = await processEmailJob(fakeJob);

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("already_sent");

    // Verify DB was not modified
    const dbEmail = await prisma.email.findUnique({
      where: { id: alreadySentEmail.id },
    });
    expect(dbEmail?.status).toBe(EmailStatus.SENT);
  });

  it("should process SCHEDULED email, send via Ethereal, and update DB status to SENT", async () => {
    const scheduledEmail = await prisma.email.create({
      data: {
        userId: testUserId,
        senderId: testSenderId,
        recipient: "to-be-sent@example.com",
        subject: "Process Me Now",
        body: "Email to be processed by worker",
        status: EmailStatus.SCHEDULED,
        scheduledAt: new Date(),
      },
    });

    const fakeJob = {
      id: scheduledEmail.id,
      data: {
        emailId: scheduledEmail.id,
        senderId: testSenderId,
        recipient: scheduledEmail.recipient,
        subject: scheduledEmail.subject,
        body: scheduledEmail.body,
      },
    } as unknown as Job<EmailJobData>;

    const result = await processEmailJob(fakeJob);

    expect(result.status).toBe("sent");
    expect(result.emailId).toBe(scheduledEmail.id);
    expect(result.previewUrl).toBeDefined();

    // Verify DB status updated to SENT with sentAt populated
    const dbEmail = await prisma.email.findUnique({
      where: { id: scheduledEmail.id },
    });
    expect(dbEmail?.status).toBe(EmailStatus.SENT);
    expect(dbEmail?.sentAt).not.toBeNull();
  }, 30000);
});

