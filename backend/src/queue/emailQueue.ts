import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const EMAIL_QUEUE_NAME = "email-queue";

export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

