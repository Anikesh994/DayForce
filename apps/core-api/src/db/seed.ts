/**
 * Seed script — uses same DatabaseSync driver as the API (node:sqlite).
 * Run: npx tsx src/db/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { getDb, queryAll, execute } from './index.js';
import { initSchema } from './database.js';
import { detectExceptions } from '../domain/exceptionDetector.js';
import { runInvestigationPipeline } from '../domain/investigationRunner.js';

function toUtc(localDatetime: string, offsetHours: number): string {
  const d = new Date(localDatetime);
  d.setTime(d.getTime() - offsetHours * 60 * 60 * 1000);
  return d.toISOString();
}

const EST_OFFSET = 5; // UTC-5

function addMinutes(isoStr: string, mins: number): string {
  const d = new Date(isoStr);
  d.setTime(d.getTime() + mins * 60 * 1000);
  return d.toISOString();
}

export async function seed() {
  initSchema();
  const db = getDb(); // ensures schema is applied

  // Idempotent clear
  db.exec(`
    DELETE FROM notifications; DELETE FROM audit_logs; DELETE FROM workflow_runs;
    DELETE FROM policy_chunks; DELETE FROM policy_documents;
    DELETE FROM approvals; DELETE FROM recommendations; DELETE FROM investigations;
    DELETE FROM exception_cases; DELETE FROM leave_records;
    DELETE FROM attendance_records; DELETE FROM shifts;
    DELETE FROM employees; DELETE FROM users; DELETE FROM tenants;
  `);

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenantId = 'tenant-acme-corp';
  execute('INSERT INTO tenants (id, name, timezone) VALUES (?, ?, ?)',
    [tenantId, 'Acme Corporation', 'America/New_York']);

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = [
    { id: 'user-hr-admin',   role: 'HR_ADMIN',     email: 'hr.admin@acme.com',       name: 'Sarah Chen' },
    { id: 'user-mgr-ops',    role: 'MANAGER',      email: 'mgr.ops@acme.com',        name: 'David Miller' },
    { id: 'user-mgr-tech',   role: 'MANAGER',      email: 'mgr.tech@acme.com',       name: 'Lisa Park' },
    { id: 'user-emp-alice',  role: 'EMPLOYEE',     email: 'alice.johnson@acme.com',  name: 'Alice Johnson' },
    { id: 'user-emp-bob',    role: 'EMPLOYEE',     email: 'bob.smith@acme.com',      name: 'Bob Smith' },
    { id: 'user-emp-carol',  role: 'EMPLOYEE',     email: 'carol.white@acme.com',    name: 'Carol White' },
    { id: 'user-emp-dan',    role: 'EMPLOYEE',     email: 'dan.brown@acme.com',      name: 'Dan Brown' },
    { id: 'user-emp-eva',    role: 'EMPLOYEE',     email: 'eva.garcia@acme.com',     name: 'Eva Garcia' },
    { id: 'user-emp-frank',  role: 'EMPLOYEE',     email: 'frank.lee@acme.com',      name: 'Frank Lee' },
    { id: 'user-emp-grace',  role: 'EMPLOYEE',     email: 'grace.kim@acme.com',      name: 'Grace Kim' },
    { id: 'user-sysadmin',   role: 'SYSTEM_ADMIN', email: 'sysadmin@acme.com',       name: 'System Admin' },
  ];

  for (const u of users) {
    execute(
      `INSERT INTO users (id, tenant_id, email, display_name, role, is_active, password_hash)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [u.id, tenantId, u.email, u.name, u.role, 'hashed_demo1234']
    );
  }

  // ── Employees ─────────────────────────────────────────────────────────────
  const empMgrOps  = 'emp-mgr-ops';
  const empMgrTech = 'emp-mgr-tech';
  const empAlice   = 'emp-alice';
  const empBob     = 'emp-bob';
  const empCarol   = 'emp-carol';
  const empDan     = 'emp-dan';
  const empEva     = 'emp-eva';
  const empFrank   = 'emp-frank';
  const empGrace   = 'emp-grace';

  const empRows = [
    [empMgrOps,  tenantId, 'user-mgr-ops',  'E001', 'David', 'Miller', 'mgr.ops@acme.com',      'Operations', 'Operations Manager',    null,       'New York', 'America/New_York'],
    [empMgrTech, tenantId, 'user-mgr-tech', 'E002', 'Lisa',  'Park',   'mgr.tech@acme.com',     'Technology', 'Technology Manager',    null,       'New York', 'America/New_York'],
    [empAlice,   tenantId, 'user-emp-alice','E003', 'Alice', 'Johnson','alice.johnson@acme.com', 'Operations', 'Ops Coordinator',       empMgrOps,  'New York', 'America/New_York'],
    [empBob,     tenantId, 'user-emp-bob',  'E004', 'Bob',   'Smith',  'bob.smith@acme.com',     'Operations', 'Field Technician',      empMgrOps,  'New York', 'America/New_York'],
    [empCarol,   tenantId, 'user-emp-carol','E005', 'Carol', 'White',  'carol.white@acme.com',   'Technology', 'Software Engineer',     empMgrTech, 'New York', 'America/New_York'],
    [empDan,     tenantId, 'user-emp-dan',  'E006', 'Dan',   'Brown',  'dan.brown@acme.com',     'Operations', 'Warehouse Supervisor',  empMgrOps,  'New York', 'America/New_York'],
    [empEva,     tenantId, 'user-emp-eva',  'E007', 'Eva',   'Garcia', 'eva.garcia@acme.com',    'Technology', 'QA Engineer',           empMgrTech, 'New York', 'America/New_York'],
    [empFrank,   tenantId, 'user-emp-frank','E008', 'Frank', 'Lee',    'frank.lee@acme.com',     'Operations', 'Logistics Coordinator', empMgrOps,  'New York', 'America/New_York'],
    [empGrace,   tenantId, 'user-emp-grace','E009', 'Grace', 'Kim',    'grace.kim@acme.com',     'Technology', 'DevOps Engineer',       empMgrTech, 'New York', 'America/New_York'],
  ];

  for (const r of empRows) {
    execute(
      `INSERT INTO employees (id,tenant_id,user_id,employee_code,first_name,last_name,email,
        department,job_title,manager_employee_id,location,timezone)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      r
    );
  }

  // ── Shifts + Attendance ───────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stdEmployees = [empAlice, empBob, empCarol, empDan, empEva, empFrank, empGrace];

  // Track per-employee shift list for scenario assignment
  const shiftsByEmp: Record<string, string[]> = {};

  for (let d = -14; d <= -1; d++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + d);
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const dateStr = dt.toISOString().slice(0, 10);

    for (const empId of stdEmployees) {
      let startTime = '09:00';
      let endTime   = '17:00';
      let shiftType = 'REGULAR';

      if (empId === empFrank) { startTime = '08:00'; endTime = '16:00'; }
      if (empId === empGrace) { startTime = '10:00'; endTime = '18:00'; }
      if (empId === empDan && dow === 3) { startTime = '22:00'; endTime = '06:00'; shiftType = 'OVERNIGHT'; }

      const startLocal = `${dateStr}T${startTime}`;
      const endDateStr = (shiftType === 'OVERNIGHT')
        ? new Date(dt.getTime() + 86400000).toISOString().slice(0, 10)
        : dateStr;
      const endLocal   = `${endDateStr}T${endTime}`;

      const startUtc = toUtc(startLocal, EST_OFFSET);
      const endUtc   = toUtc(endLocal,   EST_OFFSET);
      const shiftId  = `shift-${empId}-${dateStr}`;

      execute(
        `INSERT INTO shifts (id,tenant_id,employee_id,local_date,timezone,
          scheduled_start_utc,scheduled_end_utc,break_minutes,shift_type,status,version)
         VALUES (?,?,?,?,?,?,?,30,?,'COMPLETED',1)`,
        [shiftId, tenantId, empId, dateStr, 'America/New_York', startUtc, endUtc, shiftType]
      );

      if (!shiftsByEmp[empId]) shiftsByEmp[empId] = [];
      shiftsByEmp[empId].push(shiftId + '|' + startUtc + '|' + endUtc + '|' + dateStr);
    }
  }

  // ── Attendance records ────────────────────────────────────────────────────
  for (const [empId, shiftList] of Object.entries(shiftsByEmp)) {
    for (let i = 0; i < shiftList.length; i++) {
      const [shiftId, startUtc, endUtc, dateStr] = shiftList[i].split('|');
      const isLast   = i === shiftList.length - 1;
      const isSecond = i === shiftList.length - 2;
      const isThird  = i === shiftList.length - 3;

      let clockIn:  string | null;
      let clockOut: string | null;
      let status = 'RECORDED';

      // Scenario A — Alice: MISSING_CLOCK_OUT (latest shift)
      if (empId === empAlice && isLast) {
        clockIn  = addMinutes(startUtc, 3);
        clockOut = null;
        status   = 'FLAGGED';
      }
      // Scenario B — Bob: LATE_ARRIVAL 25 min (latest shift)
      else if (empId === empBob && isLast) {
        clockIn  = addMinutes(startUtc, 25);
        clockOut = addMinutes(endUtc, 1);
        status   = 'FLAGGED';
      }
      // Scenario C — Carol: OVERTIME 2h over (latest shift)
      else if (empId === empCarol && isLast) {
        clockIn  = addMinutes(startUtc, -2);
        clockOut = addMinutes(endUtc, 120);
        status   = 'FLAGGED';
      }
      // Scenario D — Dan: MISSING_CLOCK_IN (second-latest)
      else if (empId === empDan && isSecond) {
        clockIn  = null;
        clockOut = addMinutes(endUtc, 0);
        status   = 'FLAGGED';
      }
      // Scenario E — Eva: LATE + EARLY (third-latest)
      else if (empId === empEva && isThird) {
        clockIn  = addMinutes(startUtc, 15);
        clockOut = addMinutes(endUtc, -60);
        status   = 'FLAGGED';
      }
      // Normal
      else {
        const inV  = Math.floor(Math.random() * 8) - 1;
        const outV = Math.floor(Math.random() * 8) - 3;
        clockIn  = addMinutes(startUtc, inV);
        clockOut = addMinutes(endUtc,   outV);
      }

      const attId = `att-${empId}-${dateStr}`;
      execute(
        `INSERT INTO attendance_records
           (id,tenant_id,employee_id,shift_id,clock_in_utc,clock_out_utc,source,status,version)
         VALUES (?,?,?,?,?,?,'BADGE_SWIPE',?,1)`,
        [attId, tenantId, empId, shiftId, clockIn, clockOut, status]
      );
    }
  }

  // ── Leave Record ──────────────────────────────────────────────────────────
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);
  execute(
    `INSERT INTO leave_records (id,tenant_id,employee_id,start_utc,end_utc,leave_type,status,approved_by)
     VALUES (?,?,?,?,?,'VACATION','APPROVED',?)`,
    [
      'leave-frank-vacation', tenantId, empFrank,
      toUtc(`${twoDaysAgoStr}T09:00`, EST_OFFSET),
      toUtc(`${twoDaysAgoStr}T17:00`, EST_OFFSET),
      'user-hr-admin',
    ]
  );

  // ── Policy Documents + Chunks ─────────────────────────────────────────────
  const policies = [
    {
      id: 'pol-timekeeping', title: 'Attendance and Timekeeping Policy', category: 'TIMEKEEPING',
      content: `ATTENDANCE AND TIMEKEEPING POLICY — Acme Corporation (DEMO / SYNTHETIC)
Version 2.1 | Effective: 2024-01-01

1. GENERAL REQUIREMENTS
All employees are required to accurately record their time worked. Employees must clock in at the start of each scheduled shift and clock out at the end. Falsification of time records is grounds for immediate disciplinary action.

2. CLOCK-IN / CLOCK-OUT PROCEDURE
Employees must use the designated time-recording system (badge swipe, web clock, or mobile app). Personal time-recording by supervisors on behalf of employees is not permitted except in documented system-outage scenarios.

3. GRACE PERIOD POLICY
A grace period of 10 minutes is provided for clock-in. Employees who clock in between 1 and 10 minutes after their scheduled start time will not have their pay reduced. Employees who clock in more than 10 minutes late are considered LATE.

4. MISSING PUNCH PROCEDURE
If an employee forgets to clock in or clock out, they must notify their direct manager within 24 hours. The manager must submit a Punch Correction Request within 48 hours. All corrections require manager approval and are subject to HR audit.

5. SCHEDULE ADHERENCE
Persistent tardiness (3 or more occurrences in a 30-day rolling period) may result in a formal written warning.`,
    },
    {
      id: 'pol-overtime', title: 'Overtime Authorization Policy', category: 'OVERTIME',
      content: `OVERTIME AUTHORIZATION POLICY — Acme Corporation (DEMO / SYNTHETIC)
Version 1.4 | Effective: 2024-01-01

1. OVERTIME DEFINITION
Overtime is defined as any hours worked in excess of 8 hours in a single workday or 40 hours in a standard workweek.

2. PRE-AUTHORIZATION REQUIREMENT
All overtime must be pre-authorized in writing by the employee's direct manager before the overtime hours are worked. Unauthorized overtime is subject to disciplinary action.

3. OVERTIME THRESHOLDS
Daily overtime threshold: 8 hours worked (excluding unpaid break time).
Any attendance record showing more than 8 hours worked on a single day will be automatically flagged for manager review.

4. OVERTIME REVIEW PROCESS
The manager receives a notification and must either: (a) approve as pre-authorized, (b) request employee explanation, or (c) reject the claim and initiate a correction.

5. CALCULATION BASIS
Overtime is calculated on actual hours worked. Meal breaks of 30 minutes or more are excluded from worked-time calculations.`,
    },
    {
      id: 'pol-missing-punch', title: 'Missing Punch Correction Procedure', category: 'MISSING_PUNCH',
      content: `MISSING PUNCH CORRECTION PROCEDURE — Acme Corporation (DEMO / SYNTHETIC)
Version 1.2 | Effective: 2024-01-01

1. PURPOSE
This procedure outlines steps for correcting a missing clock-in or clock-out punch.

2. EMPLOYEE RESPONSIBILITY
An employee who discovers a missing punch must report it to their manager by the end of the following business day, providing: (a) the date and approximate time, (b) reason for the missing punch, (c) supporting evidence such as badge swipe logs or meeting records.

3. MANAGER RESPONSIBILITY
The manager must review evidence, confirm presence, and submit a Punch Correction Request within 48 hours. The manager must not alter records without employee notification.

4. CORRECTION TIME DETERMINATION
The proposed correction time must be supported by objective evidence: badge access logs, security footage, meeting attendance, or colleague confirmation. If no objective evidence is available, the exception must be escalated to HR.

5. APPROVAL CHAIN
All punch corrections require: (1) Employee acknowledgment, (2) Direct manager approval, (3) HR review for corrections affecting overtime or payroll cut-off periods.`,
    },
    {
      id: 'pol-late-arrival', title: 'Late Arrival and Early Departure Policy', category: 'LATE_ARRIVAL',
      content: `LATE ARRIVAL AND EARLY DEPARTURE POLICY — Acme Corporation (DEMO / SYNTHETIC)
Version 1.3 | Effective: 2024-01-01

1. DEFINITIONS
Late Arrival: When an employee clocks in more than 10 minutes after their scheduled shift start time.
Early Departure: When an employee clocks out more than 15 minutes before scheduled shift end without prior authorization.

2. GRACE PERIOD
A 10-minute grace period applies to shift start times only.

3. LATE ARRIVAL CATEGORIES
Category 1 (11–30 minutes): Minor tardiness. First occurrence: verbal reminder.
Category 2 (31–60 minutes): Moderate tardiness. Manager must be notified. Time deducted from pay.
Category 3 (60+ minutes): Significant tardiness. HR review triggered. Time deducted from pay.

4. EARLY DEPARTURE
Unauthorized early departures are treated similarly to late arrivals. Medical appointments with documentation are excused with 24-hour advance notice.

5. COMBINED OCCURRENCES
An attendance record showing both a late arrival and an early departure on the same day is escalated to HR review regardless of individual magnitudes.`,
    },
    {
      id: 'pol-shift-scheduling', title: 'Shift Scheduling and Overnight Shift Guide', category: 'SHIFT_SCHEDULING',
      content: `SHIFT SCHEDULING AND OVERNIGHT SHIFT GUIDE — Acme Corporation (DEMO / SYNTHETIC)
Version 1.1 | Effective: 2024-01-01

1. SHIFT SCHEDULING
Managers are responsible for publishing shift schedules at least 7 days in advance.

2. OVERNIGHT SHIFTS
Overnight shifts are defined as shifts whose scheduled end time falls on the calendar day following the scheduled start date.

3. MINIMUM REST PERIOD
Employees must have a minimum of 8 consecutive hours off between shifts. Exceptions require manager and HR approval.

4. SHIFT CONFLICTS
A shift conflict occurs when an employee is scheduled for two overlapping shifts. The T&A system flags shift conflicts automatically.

5. BREAK REQUIREMENTS
Shifts of 6+ hours include a mandatory unpaid meal break of 30 minutes. Shifts of 8+ hours also include one paid 15-minute rest break.`,
    },
  ];

  for (const p of policies) {
    execute(
      `INSERT INTO policy_documents
         (id,tenant_id,title,category,version,effective_from,location,storage_key,checksum,ingestion_status,content)
       VALUES (?,?,?,?,'1.0','2024-01-01','ALL',?,?,'READY',?)`,
      [p.id, tenantId, p.title, p.category, `policies/${p.id}.txt`, `chk-${p.id}`, p.content]
    );

    const paragraphs = p.content.split('\n\n').filter((s) => s.trim().length > 50);
    paragraphs.forEach((para, idx) => {
      const chunkId = `${p.id}-chunk-${idx}`;
      execute(
        `INSERT INTO policy_chunks
           (id,document_id,chunk_index,page,section,text_snippet,text_hash,metadata_json)
         VALUES (?,?,?,1,?,?,?,?)`,
        [
          chunkId, p.id, idx,
          para.split('\n')[0].slice(0, 100),
          para.trim().slice(0, 500),
          `hash-${chunkId}`,
          JSON.stringify({ category: p.category, tenantId, documentTitle: p.title }),
        ]
      );
    });
  }

  // ── Auto-Detect Exceptions & Generate Seeded Approvals ───────────────────
  const startDateStr = new Date(today.getTime() - 15 * 86400000).toISOString().slice(0, 10);
  const endDateStr = today.toISOString().slice(0, 10);
  console.log('🔍 Running exception detection on seeded data...');
  const detected = await detectExceptions({
    tenantId,
    startDate: startDateStr,
    endDate: endDateStr,
  });
  console.log(`   Detected ${detected.length} exceptions.`);

  console.log('🤖 Running AI investigation pipeline on sample exceptions...');
  for (const exc of detected.slice(0, 3)) {
    try {
      const res = await runInvestigationPipeline({
        exceptionId: exc.id,
        tenantId,
        requestedByUserId: 'user-hr-admin',
      });
      console.log(`   Created Approval ${res.approvalId} for Exception ${exc.id} (${exc.exceptionType})`);
    } catch (e: any) {
      console.warn(`   Investigation note for ${exc.id}:`, e.message);
    }
  }

  // ── Seed Role-Specific Notifications ─────────────────────────────────────
  const sampleNotifs = [
    {
      id: 'notif-hr-1',
      recipientId: 'user-hr-admin',
      type: 'APPROVAL_REQUESTED',
      title: 'Action Required: Attendance Review',
      body: 'AI Investigation completed for detected attendance exceptions. 3 approvals require managerial review.',
    },
    {
      id: 'notif-hr-2',
      recipientId: 'user-hr-admin',
      type: 'POLICY_INGESTED',
      title: 'Policies Synchronized',
      body: '5 corporate attendance policies indexed into vector search with 28 chunks.',
    },
    {
      id: 'notif-ops-1',
      recipientId: 'user-mgr-ops',
      type: 'APPROVAL_REQUESTED',
      title: 'Pending Timecard Approval: Dan Brown',
      body: 'Dan Brown flagged for MISSING_CLOCK_IN. AI proposed: Categorize as missing punch and verify colleague confirmation.',
    },
    {
      id: 'notif-tech-1',
      recipientId: 'user-mgr-tech',
      type: 'APPROVAL_REQUESTED',
      title: 'Pending Timecard Approval: Eva Garcia',
      body: 'Eva Garcia flagged for LATE_ARRIVAL. AI proposed: Excuse under Category 1 grace period.',
    },
    {
      id: 'notif-alice-1',
      recipientId: 'user-emp-alice',
      type: 'ATTENDANCE_PUNCH',
      title: 'Shift Schedule Published',
      body: 'Your weekly shifts from 09:00 to 17:00 EST have been published. Remember to punch in via the Web Punch Clock.',
    },
  ];

  for (const n of sampleNotifs) {
    execute(
      `INSERT OR IGNORE INTO notifications
         (id, tenant_id, recipient_user_id, type, title, body, idempotency_key, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'UNREAD', datetime('now'))`,
      [n.id, tenantId, n.recipientId, n.type, n.title, n.body, `key-${n.id}`]
    );
  }

  console.log('✅ Seed complete.');
  console.log('   Tenant: 1 | Users: 11 | Employees: 9 | Policies: 5');
  console.log('');
  console.log('Demo logins (password: demo1234):');
  console.log('  hr.admin@acme.com    — HR_ADMIN');
  console.log('  mgr.ops@acme.com     — MANAGER');
  console.log('  mgr.tech@acme.com    — MANAGER');
  console.log('  alice.johnson@acme.com — EMPLOYEE');
}

export const runSeed = seed;

// Only run automatically when executed directly from CLI
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  seed().catch(console.error);
}
