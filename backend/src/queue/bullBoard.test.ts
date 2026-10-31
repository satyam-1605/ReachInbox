import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../config/db.js";
import { emailQueue } from "./emailQueue.js";
import { redisConnection } from "./redis.js";

describe("Bull Board Live Dashboard (Step 8)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await emailQueue.close();
    await redisConnection.quit();
  });

  it("should mount and serve Bull Board dashboard HTML on /admin/queues/", async () => {
    const res = await request(app).get("/admin/queues/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Bull Dashboard");
  });

  it("should expose queues stats through Bull Board internal API", async () => {
    const res = await request(app).get("/admin/queues/api/queues");
    expect(res.status).toBe(200);
    expect(res.body.queues).toBeDefined();
    expect(Array.isArray(res.body.queues)).toBe(true);

    const emailQueueFound = res.body.queues.some(
      (q: any) => q.name === "email-queue"
    );
    expect(emailQueueFound).toBe(true);
  });
});
