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

  it("should fail validation in production mode when Bull Board credentials are missing", () => {
    const prodEnvMissingAuth = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://reachinbox:reachinbox@localhost:5432/reachinbox",
    };

    expect(() => parseEnv(prodEnvMissingAuth as unknown as NodeJS.ProcessEnv)).toThrow(
      /BULL_BOARD_USER.*BULL_BOARD_PASS/
    );
  });

  it("should pass validation in production mode when Bull Board credentials are provided", () => {
    const prodEnvValid = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://reachinbox:reachinbox@localhost:5432/reachinbox",
      BULL_BOARD_USER: "admin",
      BULL_BOARD_PASS: "strongpassword123",
    };

    const parsed = parseEnv(prodEnvValid as unknown as NodeJS.ProcessEnv);
    expect(parsed.BULL_BOARD_USER).toBe("admin");
    expect(parsed.BULL_BOARD_PASS).toBe("strongpassword123");
  });
});

