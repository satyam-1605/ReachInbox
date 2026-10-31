import { describe, it, expect } from "vitest";
import { resolveEffectiveHourlyLimit } from "../../queue/emailProcessor.js";
import { scheduleEmailSchema } from "./emails.validation.js";
import { env } from "../../config/env.js";

describe("Hourly Limit & Delay Fallback Logic", () => {
  const envDefault = 3;
  const envCap = 100;

  describe("Effective Hourly Limit Resolution (Pure Function)", () => {
    it("should use form limit when above env default and within env cap", () => {
      // User sets 5 in form, env default is 3, env cap is 100
      const limit = resolveEffectiveHourlyLimit(5, undefined, envDefault, envCap);
      expect(limit).toBe(5);
    });

    it("should cap the limit when form limit exceeds the env cap", () => {
      // User sets 150 in form, env default is 3, env cap is 100
      const limit = resolveEffectiveHourlyLimit(150, undefined, envDefault, envCap);
      expect(limit).toBe(100);
    });

    it("should use env default when hourly limit is missing, null, or undefined", () => {
      expect(resolveEffectiveHourlyLimit(null, undefined, envDefault, envCap)).toBe(3);
      expect(resolveEffectiveHourlyLimit(undefined, undefined, envDefault, envCap)).toBe(3);
    });

    it("should honor explicit test overrideLimit regardless of form or env settings", () => {
      expect(resolveEffectiveHourlyLimit(10, 1, envDefault, envCap)).toBe(1);
    });
  });

  describe("Validation Graceful Handling of 0, Empty String, and Missing Values", () => {
    const basePayload = {
      subject: "Test Campaign",
      body: "Hello World",
      startTime: "2026-10-31T12:00:00.000Z",
      recipients: ["lead@example.com"],
    };

    it("should treat 0, empty string, and null hourlyLimit as 'not set' (undefined) without error", () => {
      const parsedWithZero = scheduleEmailSchema.parse({
        ...basePayload,
        hourlyLimit: 0,
      });
      expect(parsedWithZero.hourlyLimit).toBeUndefined();

      const parsedWithEmpty = scheduleEmailSchema.parse({
        ...basePayload,
        hourlyLimit: "",
      });
      expect(parsedWithEmpty.hourlyLimit).toBeUndefined();

      const parsedWithMissing = scheduleEmailSchema.parse(basePayload);
      expect(parsedWithMissing.hourlyLimit).toBeUndefined();
    });

    it("should parse valid positive integer hourlyLimit correctly", () => {
      const parsed = scheduleEmailSchema.parse({
        ...basePayload,
        hourlyLimit: "5",
      });
      expect(parsed.hourlyLimit).toBe(5);
    });

    it("should fallback delayBetweenEmailsMs to env default when 0, empty string, or missing", () => {
      const parsedWithZero = scheduleEmailSchema.parse({
        ...basePayload,
        delayBetweenEmailsMs: 0,
      });
      expect(parsedWithZero.delayBetweenEmailsMs).toBe(env.MIN_DELAY_BETWEEN_EMAILS_MS);

      const parsedWithEmpty = scheduleEmailSchema.parse({
        ...basePayload,
        delayBetweenEmailsMs: "",
      });
      expect(parsedWithEmpty.delayBetweenEmailsMs).toBe(env.MIN_DELAY_BETWEEN_EMAILS_MS);

      const parsedWithCustom = scheduleEmailSchema.parse({
        ...basePayload,
        delayBetweenEmailsMs: 5000,
      });
      expect(parsedWithCustom.delayBetweenEmailsMs).toBe(5000);
    });
  });
});

