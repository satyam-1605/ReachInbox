import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "./app.js";
import { prisma } from "./config/db.js";

describe("Backend App & Health Check", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 200 and connected status for GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
  });

  it("should return 404 for unknown route", async () => {
    const res = await request(app).get("/unknown-route");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Route not found");
  });
});

