/**
 * Pure functions for email scheduling calculations.
 * Allows passing clock explicitly to avoid Date.now() inside business logic (AGENTS.md 9.3).
 */

export function calculateEmailScheduleTime(
  baseTime: Date,
  index: number,
  delayMs: number
): Date {
  return new Date(baseTime.getTime() + index * delayMs);
}

export function calculateJobDelay(
  scheduledTime: Date,
  currentTime: Date = new Date()
): number {
  const diff = scheduledTime.getTime() - currentTime.getTime();
  return diff > 0 ? diff : 0;
}

