import { describe, it, expect } from 'vitest';
import {
  calculateDurationMinutes,
  evaluateLateArrival,
  evaluateMissingClockOut,
  evaluateOvertime,
  isOvernightShift,
} from '../src/utils/datetime.js';

describe('DateTime and Boundary Rule Calculations', () => {
  it('calculates duration in minutes accurately', () => {
    const start = '2026-11-18T09:00:00Z';
    const end = '2026-11-18T17:00:00Z';
    expect(calculateDurationMinutes(start, end)).toBe(480); // 8 hours * 60 = 480 mins
  });

  describe('evaluateLateArrival', () => {
    const scheduledStart = '2026-11-18T09:00:00Z';

    it('reports on-time when clocking in before scheduled start', () => {
      const punch = '2026-11-18T08:55:00Z';
      const result = evaluateLateArrival(scheduledStart, punch, 10);
      expect(result.isLate).toBe(false);
      expect(result.latenessMinutes).toBe(0);
    });

    it('reports on-time within permitted grace period (e.g. exactly 10 mins)', () => {
      const punch = '2026-11-18T09:10:00Z';
      const result = evaluateLateArrival(scheduledStart, punch, 10);
      expect(result.isLate).toBe(false);
      expect(result.latenessMinutes).toBe(10);
    });

    it('flags late arrival when exceeding grace period (e.g. 11 mins)', () => {
      const punch = '2026-11-18T09:11:00Z';
      const result = evaluateLateArrival(scheduledStart, punch, 10);
      expect(result.isLate).toBe(true);
      expect(result.latenessMinutes).toBe(11);
    });

    it('flags late arrival for demo Case B (22 mins late)', () => {
      const punch = '2026-11-18T09:22:00Z';
      const result = evaluateLateArrival(scheduledStart, punch, 10);
      expect(result.isLate).toBe(true);
      expect(result.latenessMinutes).toBe(22);
    });
  });

  describe('evaluateMissingClockOut', () => {
    const scheduledEnd = '2026-11-18T17:00:00Z';
    const clockIn = '2026-11-18T08:58:00Z';

    it('returns not missing when shift is still actively ongoing', () => {
      const currentTime = '2026-11-18T16:45:00Z';
      const result = evaluateMissingClockOut(scheduledEnd, clockIn, null, currentTime, 30);
      expect(result.isMissing).toBe(false);
    });

    it('returns not missing when within post-shift grace period (e.g. 15 mins past)', () => {
      const currentTime = '2026-11-18T17:15:00Z';
      const result = evaluateMissingClockOut(scheduledEnd, clockIn, null, currentTime, 30);
      expect(result.isMissing).toBe(false);
    });

    it('detects missing clock-out once past the 30-minute processing window', () => {
      const currentTime = '2026-11-18T17:35:00Z';
      const result = evaluateMissingClockOut(scheduledEnd, clockIn, null, currentTime, 30);
      expect(result.isMissing).toBe(true);
      expect(result.minutesPastEnd).toBe(35);
    });

    it('returns not missing if clockOut is already recorded', () => {
      const clockOut = '2026-11-18T17:01:00Z';
      const currentTime = '2026-11-18T20:00:00Z';
      const result = evaluateMissingClockOut(scheduledEnd, clockIn, clockOut, currentTime, 30);
      expect(result.isMissing).toBe(false);
    });
  });

  describe('evaluateOvertime', () => {
    it('calculates regular hours without overtime', () => {
      const clockIn = '2026-11-18T09:00:00Z';
      const clockOut = '2026-11-18T17:30:00Z'; // 8.5h - 0.5h break = 8.0h
      const result = evaluateOvertime(clockIn, clockOut, 30, 8.0);
      expect(result.hasOvertime).toBe(false);
      expect(result.workedHours).toBe(8.0);
      expect(result.overtimeHours).toBe(0);
    });

    it('detects overtime when exceeding threshold (e.g. Liam Chen Case C)', () => {
      const clockIn = '2026-11-18T08:00:00Z';
      const clockOut = '2026-11-18T20:00:00Z'; // 12h - 0.5h break = 11.5h
      const result = evaluateOvertime(clockIn, clockOut, 30, 8.0);
      expect(result.hasOvertime).toBe(true);
      expect(result.workedHours).toBe(11.5);
      expect(result.overtimeHours).toBe(3.5);
    });
  });

  describe('isOvernightShift', () => {
    it('identifies daytime shifts as not overnight', () => {
      expect(isOvernightShift('2026-11-18T09:00:00Z', '2026-11-18T17:00:00Z')).toBe(false);
    });

    it('correctly flags overnight shifts spanning UTC day boundary', () => {
      expect(isOvernightShift('2026-11-18T22:00:00Z', '2026-11-19T06:00:00Z')).toBe(true);
    });
  });
});
