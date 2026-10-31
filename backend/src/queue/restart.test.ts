import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Worker } from "bullmq";
import { prisma, EmailStatus } from "../config/db.js";
import { emailQueue, EMAIL_QUEUE_NAME, EmailJobData } from "./emailQueue.js";
import { redisConnection } from "./redis.js";
import { scheduleEmails } from "../modules/emails/emails.service.js";
import { processEmailJob } from "./emailProcessor.js";
import { getDefaultUserAndSender } from "../modules/senders/senders.service.js";
import { getHourWindow } from "./rateLimiter.js";

describe("Server Restart & Idempotency Resilience (Step 6)", () => {
  let userId: string;
  let senderId: string;

  beforeAll(async () => {
    await prisma.email.deleteMany();
    await emailQueue.obliterate({ force: true });
    const defaultData = await getDefaultUserAndSender();
    userId = defaultData.user.id;
    senderId = defaultData.sender.id;

    const window = getHourWindow(new Date());
    await redisConnection.del(`rate:${senderId}:${window}`);
  });

  beforeEach(async () => {
    const window = getHourWindow(new Date());
    await redisConnection.del(`rate:${senderId}:${window}`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await emailQueue.close();
    await redisConnection.quit();
  });

  it("should survive worker shutdown: job persists in Redis, sends once when worker restarts", async () => {
    // 1. Schedule an email to be sent in 3 seconds
    const scheduleTime = new Date(Date.now() + 3000);
    const [scheduledEmail] = await scheduleEmails({
      userId,
      senderId,
      subject: "Restart Resilience Test",
      body: "Testing delivery across worker restarts",
      startTime: scheduleTime.toISOString(),
      recipients: ["restart-test@example.com"],
      delayBetweenEmailsMs: 0,
    });

    expect(scheduledEmail).toBeDefined();
    expect(scheduledEmail.status).toBe(EmailStatus.SCHEDULED);

    // 2. Start initial worker then stop it immediately (simulating crash/shutdown)
    const worker1 = new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job, token) => processEmailJob(job, token),
      { connection: redisConnection }
    );
    await worker1.close(); // Worker is now DEAD

    // 3. Wait past the scheduled execution time while worker is offline
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // Verify: Job was NOT lost during shutdown; DB still shows SCHEDULED
    const midCheck = await prisma.email.findUnique({
      where: { id: scheduledEmail.id },
    });
    expect(midCheck?.status).toBe(EmailStatus.SCHEDULED);

    // 4. Restart: Start a new worker instance (simulating server/worker boot)
    let processedJobId: string | null = null;
    const worker2 = new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job, token) => {
        processedJobId = job.id || null;
        return processEmailJob(job, token);
      },
      { connection: redisConnection }
    );

    // Wait for restarted worker to pick up and process the delayed job
    await new Promise<void>((resolve) => {
      worker2.on("completed", (job) => {
        if (job.id === scheduledEmail.id) {
          resolve();
        }
      });
    });

    await worker2.close();

    // 5. Verify email was processed and marked SENT in DB
    expect(processedJobId).toBe(scheduledEmail.id);

    const finalCheck = await prisma.email.findUnique({
      where: { id: scheduledEmail.id },
    });
    expect(finalCheck?.status).toBe(EmailStatus.SENT);
    expect(finalCheck?.sentAt).not.toBeNull();

    // 6. Idempotency test: Attempt duplicate processing
    const duplicateJob = {
      id: scheduledEmail.id,
      data: {
        emailId: scheduledEmail.id,
        senderId,
        recipient: scheduledEmail.recipient,
        subject: scheduledEmail.subject,
        body: scheduledEmail.body,
      },
    };

    const duplicateResult = await processEmailJob(duplicateJob as any);
    expect(duplicateResult.status).toBe("skipped");
    expect(duplicateResult.reason).toBe("already_sent");
  }, 25000);
});
