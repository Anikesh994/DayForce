import { describe, it, expect, beforeAll } from 'vitest';
import { runSeed } from '../src/db/seed.js';
import { detectExceptions } from '../src/domain/exceptionDetector.js';
import { queryAll, queryOne } from '../src/db/index.js';

describe('Deterministic Exception Detector Engine', () => {
  beforeAll(async () => {
    await runSeed();
  });

  it('scans attendance and shifts over a date range and detects exceptions', async () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 14);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const detected = await detectExceptions({
      tenantId: 'tenant-acme-corp',
      startDate: fmt(start),
      endDate: fmt(today),
    });

    expect(detected).toBeDefined();
    expect(Array.isArray(detected)).toBe(true);
    // There should be detected anomalies from the seeded shifts and attendance
    expect(detected.length).toBeGreaterThan(0);

    // Verify exception attributes
    for (const exc of detected) {
      expect(exc.id).toMatch(/^exc-/);
      expect(exc.tenantId).toBe('tenant-acme-corp');
      expect(exc.dedupeKey).toContain('tenant-acme-corp');
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(exc.severity);
      expect(['MISSING_CLOCK_OUT', 'MISSING_CLOCK_IN', 'LATE_ARRIVAL', 'EARLY_DEPARTURE', 'OVERTIME_REVIEW']).toContain(exc.exceptionType);
      expect(exc.facts).toBeDefined();
    }
  });

  it('persists detected exceptions to the SQLite database with proper dedupe_key', async () => {
    const dbExceptions = queryAll<any>(
      "SELECT * FROM exception_cases WHERE tenant_id = 'tenant-acme-corp'"
    );
    expect(dbExceptions.length).toBeGreaterThan(0);

    const first = dbExceptions[0];
    expect(first.dedupe_key).toBeDefined();
    expect(['DETECTED', 'WAITING_FOR_APPROVAL']).toContain(first.status);
    expect(first.version).toBeGreaterThanOrEqual(1);

    // Verify facts can be parsed
    const facts = JSON.parse(first.facts || first.facts_json || '{}');
    expect(typeof facts).toBe('object');
  });

  it('is idempotent on subsequent scans and does not create duplicate rows', async () => {
    const countBefore = queryOne<any>(
      "SELECT COUNT(*) as count FROM exception_cases WHERE tenant_id = 'tenant-acme-corp'"
    ).count;

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 14);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // Run the scan a second time
    await detectExceptions({
      tenantId: 'tenant-acme-corp',
      startDate: fmt(start),
      endDate: fmt(today),
    });

    const countAfter = queryOne<any>(
      "SELECT COUNT(*) as count FROM exception_cases WHERE tenant_id = 'tenant-acme-corp'"
    ).count;

    expect(countAfter).toBe(countBefore);
  });
});
