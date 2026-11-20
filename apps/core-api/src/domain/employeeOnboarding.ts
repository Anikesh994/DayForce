import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, execute } from '../db/index.js';
import { detectExceptions } from './exceptionDetector.js';
import { runInvestigationPipeline } from './investigationRunner.js';

export interface SetupEmployeeOptions {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';
  department?: string;
  jobTitle?: string;
}

export async function setupEmployeeAndShifts(opts: SetupEmployeeOptions) {
  const { userId, tenantId, email, displayName, role } = opts;
  const department = opts.department || (role === 'MANAGER' ? 'Management' : 'Operations');
  const jobTitle = opts.jobTitle || (
    role === 'MANAGER' ? 'Team Manager' :
    role === 'HR_ADMIN' ? 'HR Administrator' :
    role === 'SYSTEM_ADMIN' ? 'Platform Administrator' : 'Operations Specialist'
  );

  const [firstName, ...lastNames] = displayName.trim().split(/\s+/);
  const lastName = lastNames.join(' ') || 'Member';

  // 1. Check if employee record already exists
  let emp = queryOne<any>('SELECT * FROM employees WHERE user_id = ?', [userId]);

  if (!emp) {
    const empId = `emp-${userId.replace(/^user-/, '')}-${uuidv4().substring(0, 4)}`;
    const empCount = queryOne<any>('SELECT COUNT(*) as count FROM employees WHERE tenant_id = ?', [tenantId]);
    const empCode = `E${String((empCount?.count || 10) + 1).padStart(3, '0')}`;

    // Find default manager
    let managerId: string | null = null;
    if (role === 'EMPLOYEE') {
      const deptMgr = queryOne<any>(
        'SELECT id FROM employees WHERE department = ? AND job_title LIKE "%Manager%" LIMIT 1',
        [department]
      );
      if (deptMgr) {
        managerId = deptMgr.id;
      } else {
        const anyMgr = queryOne<any>(
          'SELECT id FROM employees WHERE manager_employee_id IS NULL AND id LIKE "emp-mgr%" LIMIT 1'
        );
        managerId = anyMgr?.id || null;
      }
    }

    execute(
      `INSERT INTO employees
         (id, tenant_id, user_id, employee_code, first_name, last_name, email,
          department, job_title, manager_employee_id, location, timezone, employment_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New York HQ', 'America/New_York', 'ACTIVE', datetime('now'))`,
      [
        empId,
        tenantId,
        userId,
        empCode,
        firstName || 'Employee',
        lastName,
        email,
        department,
        jobTitle,
        managerId,
      ]
    );

    emp = queryOne<any>('SELECT * FROM employees WHERE id = ?', [empId]);
  }

  // 2. Generate standard shifts for the employee from today forward (next 14 days)
  const now = new Date();
  const dateList: string[] = [];
  for (let offset = 0; offset <= 14; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    dateList.push(dateStr);

    const existingShift = queryOne<any>(
      'SELECT id FROM shifts WHERE employee_id = ? AND local_date = ?',
      [emp.id, dateStr]
    );

    if (!existingShift) {
      const shiftId = `shift-${emp.id}-${dateStr}`;
      // Standard 9:00 AM - 5:00 PM EST (14:00 - 22:00 UTC)
      const startUtc = `${dateStr}T14:00:00.000Z`;
      const endUtc = `${dateStr}T22:00:00.000Z`;

      execute(
        `INSERT OR IGNORE INTO shifts
           (id, tenant_id, employee_id, local_date, timezone, scheduled_start_utc, scheduled_end_utc, break_minutes, shift_type, status, version, created_at)
         VALUES (?, ?, ?, ?, 'America/New_York', ?, ?, 30, 'REGULAR', 'SCHEDULED', 1, datetime('now'))`,
        [shiftId, tenantId, emp.id, dateStr, startUtc, endUtc]
      );
    }
  }

  return emp;
}
