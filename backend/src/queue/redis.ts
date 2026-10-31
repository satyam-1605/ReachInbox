import { Redis, RedisOptions } from "ioredis";
import { env } from "../config/env.js";

const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
};

export const redisConnection = new Redis(redisOptions);

redisConnection.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

