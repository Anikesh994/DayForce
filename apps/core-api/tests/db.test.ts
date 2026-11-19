import { describe, it, expect, beforeAll } from 'vitest';
import { runSeed } from '../src/db/seed.js';
import {
  tenantRepo,
  userRepo,
  employeeRepo,
  attendanceRepo,
  exceptionRepo,
  auditRepo,
} from '../src/db/repositories.js';
import { transaction } from '../src/db/index.js';

describe('SQLite Database Repositories & Transactions', () => {
  beforeAll(async () => {
    await runSeed();
  });

  it('loads seeded tenant and users', () => {
    const tenant = tenantRepo.findById('tenant-acme-corp');
    expect(tenant).not.toBeNull();
    expect(tenant?.name).toBe('Acme Corporation');

    const users = userRepo.findAll(tenant!.id);
    expect(users.length).toBeGreaterThanOrEqual(4);
    expect(users.some((u) => u.role === 'HR_ADMIN')).toBe(true);
    expect(users.some((u) => u.role === 'MANAGER')).toBe(true);
  });

  it('loads employees and preserves hierarchy', () => {
    const alice = employeeRepo.findById('emp-alice');
    expect(alice).not.toBeNull();
    expect(alice?.firstName).toBe('Alice');
    expect(alice?.managerEmployeeId).toBe('emp-mgr-ops');

    const directReports = employeeRepo.findDirectReports('emp-mgr-ops');
    expect(directReports.some((r) => r.id === 'emp-alice')).toBe(true);
  });

  it('creates and deduplicates exception cases via dedupeKey', () => {
    const dedupeKey = 'exc:tenant-acme-corp:emp-alice:test-shift:MISSING_CLOCK_OUT';
    
    // First upsert creates
    const exc1 = exceptionRepo.upsert({
      id: 'exc-alice-test-01',
      tenantId: 'tenant-acme-corp',
      employeeId: 'emp-alice',
      shiftId: null as any,
      attendanceRecordId: null as any,
      exceptionType: 'MISSING_CLOCK_OUT',
      severity: 'HIGH',
      status: 'DETECTED',
      dedupeKey,
      facts: { scheduledEnd: '17:00', minutesPast: 45 },
    });
    expect(exc1.id).toBe('exc-alice-test-01');
    expect(exc1.severity).toBe('HIGH');

    // Second upsert updates facts and does NOT create duplicate row
    const exc2 = exceptionRepo.upsert({
      id: 'exc-alice-test-duplicate-attempt',
      tenantId: 'tenant-acme-corp',
      employeeId: 'emp-alice',
      shiftId: null as any,
      attendanceRecordId: null as any,
      exceptionType: 'MISSING_CLOCK_OUT',
      severity: 'HIGH',
      status: 'DETECTED',
      dedupeKey,
      facts: { scheduledEnd: '17:00', minutesPast: 60 },
    });
    expect(exc2.id).toBe('exc-alice-test-01'); // Kept original ID
    expect(exc2.facts.minutesPast).toBe(60);
  });

  it('enforces optimistic concurrency control on attendance record updates', () => {
    const records = attendanceRepo.findAll('tenant-acme-corp');
    expect(records.length).toBeGreaterThan(0);
    const rec = records[0];

    // Update with correct version succeeds
    const updated = attendanceRepo.updatePunchesWithVersionCheck(
      rec.id,
      '2026-11-18T17:00:00Z',
      null,
      rec.version,
      'SYSTEM_ADJUSTMENT'
    );
    expect(updated.version).toBe(rec.version + 1);
    expect(updated.clockOutUtc).toBe('2026-11-18T17:00:00Z');

    // Stale update with old version now fails with CONCURRENCY_CONFLICT
    expect(() => {
      attendanceRepo.updatePunchesWithVersionCheck(
        rec.id,
        '2026-11-18T17:30:00Z',
        null,
        rec.version, // Stale version!
        'SYSTEM_ADJUSTMENT'
      );
    }).toThrow(/CONCURRENCY_CONFLICT/);
  });

  it('executes atomic transactions and appends audit log entries', () => {
    const correlationId = 'test-corr-tx-001';

    transaction(() => {
      auditRepo.create({
        tenantId: 'tenant-acme-corp',
        actorType: 'USER',
        actorId: 'user-mgr-ops',
        action: 'CORRECTION_APPLIED',
        entityType: 'AttendanceRecord',
        entityId: 'att-test-01',
        before: { clockOutUtc: null },
        after: { clockOutUtc: '2026-11-18T17:00:00Z' },
        reason: 'Manager verified full shift worked.',
        correlationId,
      });
    });

    const logs = auditRepo.findAll('tenant-acme-corp');
    const matchingLog = logs.find((l) => l.correlation_id === correlationId);
    expect(matchingLog).toBeDefined();
    expect(matchingLog.action).toBe('CORRECTION_APPLIED');
    expect(matchingLog.after.clockOutUtc).toBe('2026-11-18T17:00:00Z');
  });
});
