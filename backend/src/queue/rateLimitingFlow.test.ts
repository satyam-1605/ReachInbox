import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Job } from "bullmq";
import { prisma, EmailStatus } from "../config/db.js";
import { processEmailJob } from "./emailProcessor.js";
import { EmailJobData, emailQueue } from "./emailQueue.js";
import { redisConnection } from "./redis.js";
import { getDefaultUserAndSender } from "../modules/senders/senders.service.js";
import { getHourWindow } from "./rateLimiter.js";

describe("Rate Limiting Flow & Reschedule (Step 5)", () => {
  let userId: string;
  let senderId: string;
  const fakeClock = new Date("2026-10-30T10:00:00.000Z");

  beforeAll(async () => {
    await prisma.email.deleteMany();
    const defaultData = await getDefaultUserAndSender();
    userId = defaultData.user.id;
    senderId = defaultData.sender.id;

    // Reset rate limit key for this sender and hour
    const window = getHourWindow(fakeClock);
    await redisConnection.del(`rate:${senderId}:${window}`);
    await redisConnection.del(`rate_alert_sent:${senderId}:${window}`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await emailQueue.close();
    await redisConnection.quit();
  });

  it("should enforce limit 3: send 3 emails and reschedule remaining 2 to next hour window", async () => {
    const limit = 3;
    const totalEmails = 5;
    const createdEmails = [];

    // Create 5 emails in DB
    for (let i = 0; i < totalEmails; i++) {
      const email = await prisma.email.create({
        data: {
          userId,
          senderId,
          recipient: `lead-${i}@example.com`,
          subject: `Rate limit test lead ${i}`,
          body: `Body content ${i}`,
          status: EmailStatus.SCHEDULED,
          scheduledAt: fakeClock,
        },
      });
      createdEmails.push(email);
    }

    const results = [];

    // Process all 5 emails sequentially
    for (const email of createdEmails) {
      const fakeJob = {
        id: email.id,
        data: {
          emailId: email.id,
          senderId,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
        },
      } as unknown as Job<EmailJobData>;

      const res = await processEmailJob(fakeJob, undefined, fakeClock, limit);
      results.push(res);
    }

    // First 3 should be sent
    expect(results[0]?.status).toBe("sent");
    expect(results[1]?.status).toBe("sent");
    expect(results[2]?.status).toBe("sent");

    // 4th and 5th should be rescheduled, NEVER dropped or failed
    expect(results[3]?.status).toBe("rescheduled");
    expect(results[3]?.isFirstOverLimit).toBe(true); // First over-limit hit triggers Slack flag

    expect(results[4]?.status).toBe("rescheduled");
    expect(results[4]?.isFirstOverLimit).toBe(false); // Second over-limit does not re-trigger Slack

    // Verify DB states
    const sentInDb = await prisma.email.count({
      where: { senderId, status: EmailStatus.SENT },
    });
    expect(sentInDb).toBe(3);

    const rescheduledInDb = await prisma.email.findMany({
      where: {
        senderId,
        id: { in: [createdEmails[3].id, createdEmails[4].id] },
      },
    });

    expect(rescheduledInDb).toHaveLength(2);
    // ScheduledAt should now point to 11:00 UTC (the next hour start)
    expect(rescheduledInDb[0].scheduledAt.toISOString()).toBe("2026-10-30T11:00:00.000Z");
    expect(rescheduledInDb[1].scheduledAt.toISOString()).toBe("2026-10-30T11:00:00.000Z");
  }, 30000);
});

