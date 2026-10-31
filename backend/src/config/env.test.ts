import { describe, it, expect } from "vitest";
import { parseEnv } from "./env.js";

describe("Environment Validation", () => {
  it("should fail validation when DATABASE_URL is missing", () => {
    const invalidEnv = {
      NODE_ENV: "development",
      PORT: "4000",
      // DATABASE_URL is intentionally omitted
    };

    expect(() => parseEnv(invalidEnv as unknown as NodeJS.ProcessEnv)).toThrow(
      /Environment validation failed.*DATABASE_URL/
    );
  });

  it("should parse valid environment with defaults", () => {
    const validEnv = {
      DATABASE_URL: "postgresql://reachinbox:reachinbox@localhost:5432/reachinbox",
    };

    const parsed = parseEnv(validEnv as unknown as NodeJS.ProcessEnv);
    expect(parsed.DATABASE_URL).toBe("postgresql://reachinbox:reachinbox@localhost:5432/reachinbox");
    expect(parsed.PORT).toBe(4000);
    expect(parsed.WORKER_CONCURRENCY).toBe(2);
    expect(parsed.MAX_EMAILS_PER_HOUR_PER_SENDER).toBe(3);
  });
});

