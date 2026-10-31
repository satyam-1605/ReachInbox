import { Worker } from "bullmq";
import { env } from "./config/env.js";
import { redisConnection } from "./queue/redis.js";
import { EMAIL_QUEUE_NAME, EmailJobData } from "./queue/emailQueue.js";
import { processEmailJob } from "./queue/emailProcessor.js";

console.log(
  `[Worker] Initializing worker on queue "${EMAIL_QUEUE_NAME}" with concurrency ${env.WORKER_CONCURRENCY}...`
);

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job, token) => {
    return processEmailJob(job, token);
  },
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
  }
);

emailWorker.on("completed", (job, result) => {
  console.log(`[Worker] Job ${job.id} completed. Status: ${result?.status}`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

const gracefulShutdown = async () => {
  console.log("[Worker] Shutting down gracefully...");
  await emailWorker.close();
  await redisConnection.quit();
  console.log("[Worker] Closed.");
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
