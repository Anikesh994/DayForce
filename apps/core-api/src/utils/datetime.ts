/**
 * Deterministic Date/Time & Timezone Utilities
 * All timestamps stored in UTC; schedule comparisons are timezone-aware.
 */

export interface TimeInterval {
  startUtc: string; // ISO 8601 UTC
  endUtc: string;   // ISO 8601 UTC
}

/**
 * Calculates duration in minutes between two ISO 8601 UTC timestamps.
 */
export function calculateDurationMinutes(startUtc: string, endUtc: string): number {
  const start = new Date(startUtc).getTime();
  const end = new Date(endUtc).getTime();
  if (isNaN(start) || isNaN(end)) {
    throw new Error(`Invalid UTC timestamp provided: ${startUtc} or ${endUtc}`);
  }
  return Math.round((end - start) / (1000 * 60));
}

/**
 * Determines whether actual clock-in is late considering scheduled start and grace period.
 * Returns { isLate, latenessMinutes }
 */
export function evaluateLateArrival(
  scheduledStartUtc: string,
  actualClockInUtc: string,
  gracePeriodMinutes: number = 10
): { isLate: boolean; latenessMinutes: number } {
  const scheduledMs = new Date(scheduledStartUtc).getTime();
  const actualMs = new Date(actualClockInUtc).getTime();
  const diffMinutes = Math.round((actualMs - scheduledMs) / (1000 * 60));

  if (diffMinutes > gracePeriodMinutes) {
    return { isLate: true, latenessMinutes: diffMinutes };
  }
  return { isLate: false, latenessMinutes: Math.max(0, diffMinutes) };
}

/**
 * Determines whether an attendance record has a missing clock-out anomaly.
 * Condition: clock-in exists, clock-out is null, and current time > scheduled end + grace period.
 */
export function evaluateMissingClockOut(
  scheduledEndUtc: string,
  actualClockInUtc: string | null,
  actualClockOutUtc: string | null,
  currentTimeUtc: string = new Date().toISOString(),
  processingGraceMinutes: number = 30
): { isMissing: boolean; minutesPastEnd: number } {
  if (!actualClockInUtc || actualClockOutUtc) {
    return { isMissing: false, minutesPastEnd: 0 };
  }

  const endMs = new Date(scheduledEndUtc).getTime();
  const nowMs = new Date(currentTimeUtc).getTime();
  const diffMinutes = Math.round((nowMs - endMs) / (1000 * 60));

  if (diffMinutes >= processingGraceMinutes) {
    return { isMissing: true, minutesPastEnd: diffMinutes };
  }

  return { isMissing: false, minutesPastEnd: diffMinutes };
}

/**
 * Evaluates whether worked time exceeds a daily overtime threshold in hours (e.g. 8.0 or 10.0 hours).
 */
export function evaluateOvertime(
  actualClockInUtc: string,
  actualClockOutUtc: string,
  breakMinutes: number = 30,
  dailyOvertimeThresholdHours: number = 8.0
): { hasOvertime: boolean; workedHours: number; overtimeHours: number } {
  const durationMins = calculateDurationMinutes(actualClockInUtc, actualClockOutUtc);
  const netWorkedMins = Math.max(0, durationMins - breakMinutes);
  const workedHours = Number((netWorkedMins / 60).toFixed(2));
  const overtimeHours = Number(Math.max(0, workedHours - dailyOvertimeThresholdHours).toFixed(2));

  return {
    hasOvertime: overtimeHours > 0,
    workedHours,
    overtimeHours,
  };
}

/**
 * Determines whether a shift is an overnight shift (ends on the next calendar date in local timezone).
 */
export function isOvernightShift(scheduledStartUtc: string, scheduledEndUtc: string): boolean {
  const start = new Date(scheduledStartUtc);
  const end = new Date(scheduledEndUtc);
  return end.getUTCDate() !== start.getUTCDate() || end.getTime() < start.getTime();
}
