import { Job, DelayedError } from "bullmq";
import { prisma, EmailStatus } from "../config/db.js";
import { env } from "../config/env.js";
import { EmailJobData, emailQueue } from "./emailQueue.js";
import { redisConnection } from "./redis.js";
import { sendEmailViaEthereal } from "../modules/emails/emailSender.service.js";
import { checkAndIncrementRateLimit } from "./rateLimiter.js";
import { updateEmailInIndex } from "../modules/search/elasticsearch.js";
import { sendSlackRateLimitAlert } from "../modules/slack/slack.service.js";

export function resolveEffectiveHourlyLimit(
  formHourlyLimit: number | null | undefined,
  overrideLimit?: number,
  envDefault: number = env.MAX_EMAILS_PER_HOUR_PER_SENDER,
  envCap: number = env.MAX_HOURLY_LIMIT_CAP
): number {
  if (overrideLimit !== undefined) {
    return overrideLimit;
  }
  if (formHourlyLimit != null) {
    return Math.min(formHourlyLimit, envCap);
  }
  return envDefault;
}

export async function processEmailJob(
  job: Job<EmailJobData>,
  token?: string,
  clock: Date = new Date(),
  overrideLimit?: number
) {
  const { emailId, senderId } = job.data;

  // 1. Idempotency check: Before sending, check the DB status. If already sent, skip.
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { sender: true },
  });

  if (!email) {
    console.warn(`[Worker] Email ${emailId} not found in DB. Skipping.`);
    return { status: "skipped", reason: "not_found" };
  }

  if (email.status === EmailStatus.SENT) {
    console.log(`[Worker] Email ${emailId} already marked as SENT. Skipping for idempotency.`);
    return { status: "skipped", reason: "already_sent" };
  }

  // 2. Determine effective hourly limit: overrideLimit (tests) -> form limit (capped by env cap) -> env default
  const effectiveHourlyLimit = resolveEffectiveHourlyLimit(
    (email as any).hourlyLimit,
    overrideLimit
  );

  // 3. Hourly limit check with atomic Redis counter
  const rateCheck = await checkAndIncrementRateLimit(
    redisConnection,
    senderId,
    effectiveHourlyLimit,
    clock
  );

  if (!rateCheck.allowed) {
    console.log(
      `[Worker] Sender ${senderId} exceeded limit of ${effectiveHourlyLimit} for window ${rateCheck.window}. Rescheduling email ${emailId} to next hour window: ${rateCheck.nextHourStart.toISOString()}`
    );

    // Send Slack alert on first limit hit in window (if Slack connected)
    if (rateCheck.isFirstOverLimit) {
      await sendSlackRateLimitAlert(
        email.sender.name,
        email.sender.email,
        rateCheck.window,
        email.userId
      ).catch((err) => {
        console.warn("[Slack Alert note]", err instanceof Error ? err.message : err);
      });
    }

    // Update DB scheduled time to next window start
    await prisma.email.update({
      where: { id: email.id },
      data: {
        scheduledAt: rateCheck.nextHourStart,
      },
    });

    // Reschedule in BullMQ to the next hour window
    if (token) {
      await job.moveToDelayed(rateCheck.nextHourStart.getTime(), token);
      throw new DelayedError();
    } else {
      // Fallback for tests/direct invocations without worker token
      return {
        status: "rescheduled",
        emailId: email.id,
        rescheduledTo: rateCheck.nextHourStart,
        isFirstOverLimit: rateCheck.isFirstOverLimit,
      };
    }
  }

  try {
    // 3. Send via Ethereal SMTP
    const sendResult = await sendEmailViaEthereal({
      fromName: email.sender.name,
      fromEmail: email.sender.email,
      to: email.recipient,
      subject: email.subject,
      body: email.body,
    });

    // 4. Update DB status right after successful send
    const updatedEmail = await prisma.email.update({
      where: { id: email.id },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
      },
    });

    // 5. Update Elasticsearch index
    await updateEmailInIndex(updatedEmail.id, "SENT", updatedEmail.sentAt);

    return {
      status: "sent",
      emailId: updatedEmail.id,
      previewUrl: sendResult.previewUrl,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to send email";
    console.error(`[Worker] Error sending email ${email.id}:`, errorMsg);

    await prisma.email.update({
      where: { id: email.id },
      data: {
        status: EmailStatus.FAILED,
        failedReason: errorMsg,
      },
    });

    throw error;
  }
}
