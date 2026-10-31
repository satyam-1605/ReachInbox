import { prisma, EmailStatus } from "../../config/db.js";
import { emailQueue, EmailJobData } from "../../queue/emailQueue.js";
import { ScheduleEmailInput } from "./emails.validation.js";
import { calculateEmailScheduleTime, calculateJobDelay } from "./emails.helper.js";
import { getDefaultUserAndSender } from "../senders/senders.service.js";
import { indexEmail } from "../search/elasticsearch.js";

export async function scheduleEmails(
  input: ScheduleEmailInput,
  clock: Date = new Date()
) {
  let userId = input.userId;
  let senderId = input.senderId;

  if (userId && !senderId) {
    let userSender = await prisma.sender.findFirst({
      where: { userId },
    });

    if (!userSender) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        userSender = await prisma.sender.create({
          data: {
            userId: user.id,
            name: user.name || "Default Sender",
            email: user.email,
          },
        });
      }
    }

    if (userSender) {
      senderId = userSender.id;
    }
  }

  if (!userId || !senderId) {
    const defaultData = await getDefaultUserAndSender();
    userId = userId || defaultData.user.id;
    senderId = senderId || defaultData.sender.id;
  }

  const activeUserId: string = userId;
  const activeSenderId: string = senderId;

  const baseTime = new Date(input.startTime);
  const scheduledEmails = [];

  for (let i = 0; i < input.recipients.length; i++) {
    const recipient = input.recipients[i];
    const scheduledAt = calculateEmailScheduleTime(
      baseTime,
      i,
      input.delayBetweenEmailsMs
    );

    // 1. Create DB record first (status: SCHEDULED)
    const email = await prisma.email.create({
      data: {
        userId: activeUserId,
        senderId: activeSenderId,
        recipient,
        subject: input.subject,
        body: input.body,
        status: EmailStatus.SCHEDULED,
        scheduledAt,
        hourlyLimit: input.hourlyLimit ?? null,
      },
    });

    // 2. Index in Elasticsearch
    await indexEmail({
      id: email.id,
      userId: email.userId,
      senderId: email.senderId,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt.toISOString(),
      sentAt: null,
      createdAt: email.createdAt.toISOString(),
    });

    // 3. Queue BullMQ delayed job with jobId = emailId for idempotency
    const delay = calculateJobDelay(scheduledAt, clock);
    const jobData: EmailJobData = {
      emailId: email.id,
      senderId: email.senderId,
      recipient,
      subject: input.subject,
      body: input.body,
    };

    await emailQueue.add("sendEmail", jobData, {
      jobId: email.id,
      delay,
    });

    scheduledEmails.push(email);
  }

  return scheduledEmails;
}

export async function getScheduledEmails(userId?: string) {
  const where = {
    status: EmailStatus.SCHEDULED,
    ...(userId ? { userId } : {}),
  };

  return prisma.email.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getSentEmails(userId?: string) {
  const where = {
    status: EmailStatus.SENT,
    ...(userId ? { userId } : {}),
  };

  return prisma.email.findMany({
    where,
    orderBy: { sentAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

