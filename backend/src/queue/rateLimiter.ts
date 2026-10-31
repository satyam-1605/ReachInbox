import { Redis } from "ioredis";

/**
 * Pure function: Formats a Date into an hour window key (YYYY-MM-DD-HH)
 * Uses UTC to ensure timezone independence across servers.
 */
export function getHourWindow(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  return `${year}-${month}-${day}-${hour}`;
}

/**
 * Pure function: Calculates the exact start time of the next hour window.
 */
export function getNextHourStart(date: Date): Date {
  const next = new Date(date.getTime());
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

/**
 * Pure function: Calculates delay in milliseconds until the next hour window.
 */
export function calculateDelayUntilNextHour(
  currentTime: Date,
  nextHourDate: Date = getNextHourStart(currentTime)
): number {
  const diff = nextHourDate.getTime() - currentTime.getTime();
  return diff > 0 ? diff : 0;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  window: string;
  nextHourStart: Date;
  delayUntilNextHourMs: number;
  isFirstOverLimit: boolean;
}

/**
 * Atomically checks and increments the hourly sender counter in Redis.
 * Key format: rate:{senderId}:{hourWindow}
 * If count > limit, atomically decrements back and returns allowed: false.
 */
export async function checkAndIncrementRateLimit(
  redis: Redis,
  senderId: string,
  hourlyLimit: number,
  clock: Date = new Date()
): Promise<RateLimitCheckResult> {
  const window = getHourWindow(clock);
  const rateKey = `rate:${senderId}:${window}`;
  const alertKey = `rate_alert_sent:${senderId}:${window}`;

  // Atomic increment
  const currentCount = await redis.incr(rateKey);

  // Set TTL of 2 hours on the first increment
  if (currentCount === 1) {
    await redis.expire(rateKey, 7200);
  }

  const nextHourStart = getNextHourStart(clock);
  const delayUntilNextHourMs = calculateDelayUntilNextHour(clock, nextHourStart);

  if (currentCount > hourlyLimit) {
    // Decrement back so counter reflects actual sends in this window
    await redis.decr(rateKey);

    // Check if this is the first time the limit was hit in this window
    // SETNX returns 1 if key was set (first time), 0 if already set
    const firstHit = await redis.set(alertKey, "1", "EX", 7200, "NX");
    const isFirstOverLimit = firstHit === "OK";

    return {
      allowed: false,
      currentCount: hourlyLimit,
      window,
      nextHourStart,
      delayUntilNextHourMs,
      isFirstOverLimit,
    };
  }

  return {
    allowed: true,
    currentCount,
    window,
    nextHourStart,
    delayUntilNextHourMs: 0,
    isFirstOverLimit: false,
  };
}

