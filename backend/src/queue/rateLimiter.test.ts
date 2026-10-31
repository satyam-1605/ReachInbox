import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getHourWindow,
  getNextHourStart,
  calculateDelayUntilNextHour,
  checkAndIncrementRateLimit,
} from "./rateLimiter.js";
import { redisConnection } from "./redis.js";

describe("Rate Limiter Pure Functions & Atomic Counter (Step 5)", () => {
  afterAll(async () => {
    await redisConnection.quit();
  });

  describe("Hour Window Calculations (Pure functions)", () => {
    it("should return the same hour window for dates within the same hour", () => {
      const date1 = new Date("2026-10-30T10:05:00.000Z");
      const date2 = new Date("2026-10-30T10:55:00.000Z");

      expect(getHourWindow(date1)).toBe("2026-10-30-10");
      expect(getHourWindow(date2)).toBe("2026-10-30-10");
      expect(getHourWindow(date1)).toBe(getHourWindow(date2));
    });

    it("should return a new hour window when the hour changes", () => {
      const date1 = new Date("2026-10-30T10:59:59.000Z");
      const date2 = new Date("2026-10-30T11:00:00.000Z");

      expect(getHourWindow(date1)).toBe("2026-10-30-10");
      expect(getHourWindow(date2)).toBe("2026-10-30-11");
      expect(getHourWindow(date1)).not.toBe(getHourWindow(date2));
    });

    it("should correctly compute the start of the next hour", () => {
      const current = new Date("2026-10-30T10:35:20.123Z");
      const nextHour = getNextHourStart(current);

      expect(nextHour.toISOString()).toBe("2026-10-30T11:00:00.000Z");
    });

    it("should calculate delay until next hour window accurately", () => {
      const current = new Date("2026-10-30T10:45:00.000Z");
      const nextHour = new Date("2026-10-30T11:00:00.000Z"); // 15 minutes = 900,000 ms

      const delay = calculateDelayUntilNextHour(current, nextHour);
      expect(delay).toBe(15 * 60 * 1000);
    });
  });

  describe("Redis Atomic Rate Limiting", () => {
    const senderId = "test-sender-step5";
    const fakeHour = new Date("2026-10-30T14:15:00.000Z");

    beforeAll(async () => {
      // Clean up rate keys for this test
      const window = getHourWindow(fakeHour);
      await redisConnection.del(`rate:${senderId}:${window}`);
      await redisConnection.del(`rate_alert_sent:${senderId}:${window}`);
    });

    it("should allow sends up to the limit and return allowed: true", async () => {
      const limit = 3;

      // 1st email
      const res1 = await checkAndIncrementRateLimit(redisConnection, senderId, limit, fakeHour);
      expect(res1.allowed).toBe(true);
      expect(res1.currentCount).toBe(1);

      // 2nd email
      const res2 = await checkAndIncrementRateLimit(redisConnection, senderId, limit, fakeHour);
      expect(res2.allowed).toBe(true);
      expect(res2.currentCount).toBe(2);

      // 3rd email
      const res3 = await checkAndIncrementRateLimit(redisConnection, senderId, limit, fakeHour);
      expect(res3.allowed).toBe(true);
      expect(res3.currentCount).toBe(3);
    });

    it("should reject 4th email, flag first-time over limit, and instruct to reschedule", async () => {
      const limit = 3;

      // 4th email (exceeds limit 3)
      const res4 = await checkAndIncrementRateLimit(redisConnection, senderId, limit, fakeHour);
      expect(res4.allowed).toBe(false);
      expect(res4.isFirstOverLimit).toBe(true);
      expect(res4.delayUntilNextHourMs).toBeGreaterThan(0);

      // 5th email (also exceeds, but is NOT the first hit)
      const res5 = await checkAndIncrementRateLimit(redisConnection, senderId, limit, fakeHour);
      expect(res5.allowed).toBe(false);
      expect(res5.isFirstOverLimit).toBe(false);
    });
  });
});

