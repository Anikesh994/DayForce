import { queryOne, queryAll, execute, transaction } from './index.js';
import type {
  Tenant,
  User,
  Employee,
  Shift,
  AttendanceRecord,
  LeaveRecord,
  ExceptionCase,
  Investigation,
  Recommendation,
  Approval,
  PolicyDocument,
  PolicyChunk,
  AuditLog,
} from './types.js';

// --- MAPPERS ---
function mapEmployee(row: any): (Employee & { managerName?: string }) | null {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    department: row.department,
    jobTitle: row.job_title,
    managerEmployeeId: row.manager_employee_id,
    location: row.location,
    timezone: row.timezone,
    employmentStatus: row.employment_status,
    createdAt: row.created_at,
    managerName: row.managerName,
  };
}

function mapAttendance(row: any): (AttendanceRecord & { employeeName?: string; employeeCode?: string; department?: string }) | null {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    shiftId: row.shift_id,
    clockInUtc: row.clock_in_utc,
    clockOutUtc: row.clock_out_utc,
    source: row.source,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    employeeName: row.employeeName,
    employeeCode: row.employeeCode,
    department: row.department,
  };
}

function mapException(row: any): (ExceptionCase & { employeeName?: string; employeeCode?: string; department?: string }) | null {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    shiftId: row.shift_id,
    attendanceRecordId: row.attendance_record_id,
    exceptionType: row.exception_type,
    severity: row.severity,
    status: row.status,
    dedupeKey: row.dedupe_key,
    facts: typeof row.facts === 'string' ? JSON.parse(row.facts || '{}') : (row.facts || {}),
    version: row.version,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at,
    assignedManagerId: row.assigned_manager_id,
    employeeName: row.employeeName,
    employeeCode: row.employeeCode,
    department: row.department,
  };
}

// --- TENANTS ---
export const tenantRepo = {
  findById(id: string): Tenant | null {
    const row = queryOne<any>('SELECT * FROM tenants WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      timezone: row.timezone,
      createdAt: row.created_at,
    };
  },
  create(tenant: Omit<Tenant, 'createdAt'> & { createdAt?: string }): Tenant {
    execute(
      'INSERT INTO tenants (id, name, timezone, created_at) VALUES (?, ?, ?, COALESCE(?, datetime(\'now\')))',
      [tenant.id, tenant.name, tenant.timezone, tenant.createdAt || null]
    );
    return this.findById(tenant.id)!;
  },
};

// --- USERS ---
export const userRepo = {
  findById(id: string): User | null {
    const row = queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      authProviderId: row.auth_provider_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
  },
  findByEmail(email: string): User | null {
    const row = queryOne<any>('SELECT * FROM users WHERE email = ?', [email]);
    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      authProviderId: row.auth_provider_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
  },
  findAll(tenantId: string): User[] {
    const rows = queryAll<any>('SELECT * FROM users WHERE tenant_id = ? ORDER BY display_name ASC', [tenantId]);
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      authProviderId: r.auth_provider_id,
      email: r.email,
      displayName: r.display_name,
      role: r.role,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
    }));
  },
};

// --- EMPLOYEES ---
export const employeeRepo = {
  findById(id: string): (Employee & { managerName?: string }) | null {
    const row = queryOne<any>(
      `SELECT e.*, m.first_name || ' ' || m.last_name AS managerName 
       FROM employees e 
       LEFT JOIN employees m ON e.manager_employee_id = m.id 
       WHERE e.id = ?`,
      [id]
    );
    return mapEmployee(row);
  },
  findByUserId(userId: string): Employee | null {
    const row = queryOne<any>('SELECT * FROM employees WHERE user_id = ?', [userId]);
    return mapEmployee(row);
  },
  findAll(tenantId: string, department?: string): Employee[] {
    let rows: any[];
    if (department) {
      rows = queryAll<any>('SELECT * FROM employees WHERE tenant_id = ? AND department = ? ORDER BY last_name ASC', [tenantId, department]);
    } else {
      rows = queryAll<any>('SELECT * FROM employees WHERE tenant_id = ? ORDER BY last_name ASC', [tenantId]);
    }
    return rows.map(mapEmployee).filter((e): e is Employee => e !== null);
  },
  findDirectReports(managerEmployeeId: string): Employee[] {
    const rows = queryAll<any>('SELECT * FROM employees WHERE manager_employee_id = ? ORDER BY last_name ASC', [managerEmployeeId]);
    return rows.map(mapEmployee).filter((e): e is Employee => e !== null);
  },
};

// --- SHIFTS ---
export const shiftRepo = {
  findById(id: string): Shift | null {
    const r = queryOne<any>('SELECT * FROM shifts WHERE id = ?', [id]);
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      employeeId: r.employee_id,
      localDate: r.local_date,
      timezone: r.timezone,
      scheduledStartUtc: r.scheduled_start_utc,
      scheduledEndUtc: r.scheduled_end_utc,
      breakMinutes: r.break_minutes,
      shiftType: r.shift_type,
      status: r.status,
      version: r.version,
      createdAt: r.created_at,
    };
  },
};

// --- ATTENDANCE RECORDS ---
export const attendanceRepo = {
  findById(id: string): AttendanceRecord | null {
    const row = queryOne<any>('SELECT * FROM attendance_records WHERE id = ?', [id]);
    return mapAttendance(row);
  },
  findForEmployee(employeeId: string, limit: number = 30): AttendanceRecord[] {
    const rows = queryAll<any>('SELECT * FROM attendance_records WHERE employee_id = ? ORDER BY created_at DESC LIMIT ?', [employeeId, limit]);
    return rows.map(mapAttendance).filter((r): r is AttendanceRecord => r !== null);
  },
  findAll(tenantId: string, limit: number = 50, offset: number = 0): (AttendanceRecord & { employeeName: string; employeeCode: string; department: string })[] {
    const rows = queryAll<any>(
      `SELECT a.*, e.first_name || ' ' || e.last_name AS employeeName, e.employee_code AS employeeCode, e.department
       FROM attendance_records a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.tenant_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [tenantId, limit, offset]
    );
    return rows.map(mapAttendance) as any;
  },
  updatePunchesWithVersionCheck(id: string, clockOutUtc: string | null, clockInUtc: string | null, expectedVersion: number, source: string): AttendanceRecord {
    const result = execute(
      `UPDATE attendance_records 
       SET clock_out_utc = COALESCE(?, clock_out_utc),
           clock_in_utc = COALESCE(?, clock_in_utc),
           source = ?,
           status = 'RESOLVED',
           version = version + 1
       WHERE id = ? AND version = ?`,
      [clockOutUtc, clockInUtc, source, id, expectedVersion]
    );

    if (result.changes === 0) {
      throw new Error(`CONCURRENCY_CONFLICT: Attendance record ${id} version mismatch (expected ${expectedVersion}) or record not found.`);
    }

    return this.findById(id)!;
  },
};

// --- EXCEPTION CASES ---
export const exceptionRepo = {
  findById(id: string): (ExceptionCase & { employeeName: string; employeeCode: string; department: string }) | null {
    const row = queryOne<any>(
      `SELECT ec.*, e.first_name || ' ' || e.last_name AS employeeName, e.employee_code AS employeeCode, e.department
       FROM exception_cases ec
       JOIN employees e ON ec.employee_id = e.id
       WHERE ec.id = ?`,
      [id]
    );
    return mapException(row) as any;
  },
  findByDedupeKey(dedupeKey: string): ExceptionCase | null {
    const row = queryOne<any>('SELECT * FROM exception_cases WHERE dedupe_key = ?', [dedupeKey]);
    return mapException(row);
  },
  findAll(tenantId: string, filters: { status?: string; type?: string; severity?: string; managerId?: string; limit?: number; offset?: number } = {}): any[] {
    let sql = `
      SELECT ec.*, e.first_name || ' ' || e.last_name AS employeeName, e.employee_code AS employeeCode, e.department, s.scheduled_start_utc, s.scheduled_end_utc
      FROM exception_cases ec
      JOIN employees e ON ec.employee_id = e.id
      LEFT JOIN shifts s ON ec.shift_id = s.id
      WHERE ec.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters.status) {
      sql += ' AND ec.status = ?';
      params.push(filters.status);
    }
    if (filters.type) {
      sql += ' AND ec.exception_type = ?';
      params.push(filters.type);
    }
    if (filters.severity) {
      sql += ' AND ec.severity = ?';
      params.push(filters.severity);
    }
    if (filters.managerId) {
      sql += ' AND ec.assigned_manager_id = ?';
      params.push(filters.managerId);
    }

    sql += ' ORDER BY ec.detected_at DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 50, filters.offset || 0);

    const rows = queryAll<any>(sql, params);
    return rows.map(mapException);
  },
  upsert(exc: Omit<ExceptionCase, 'detectedAt' | 'version'> & { version?: number }): ExceptionCase {
    const existing = this.findByDedupeKey(exc.dedupeKey);
    if (existing) {
      execute(
        `UPDATE exception_cases 
         SET facts = ?, severity = ?, assigned_manager_id = COALESCE(?, assigned_manager_id)
         WHERE id = ?`,
        [JSON.stringify(exc.facts), exc.severity, exc.assignedManagerId || null, existing.id]
      );
      return this.findById(existing.id)!;
    }

    execute(
      `INSERT INTO exception_cases (id, tenant_id, employee_id, shift_id, attendance_record_id, exception_type, severity, status, dedupe_key, facts, version, detected_at, assigned_manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      [exc.id, exc.tenantId, exc.employeeId, exc.shiftId || null, exc.attendanceRecordId || null, exc.exceptionType, exc.severity, exc.status, exc.dedupeKey, JSON.stringify(exc.facts), exc.version || 1, exc.assignedManagerId || null]
    );
    return this.findById(exc.id)!;
  },
  updateStatus(id: string, status: string, resolvedAt?: string): void {
    execute(
      'UPDATE exception_cases SET status = ?, resolved_at = COALESCE(?, resolved_at), version = version + 1 WHERE id = ?',
      [status, resolvedAt || null, id]
    );
  },
};

// --- AUDIT LOGS ---
export const auditRepo = {
  create(log: Omit<AuditLog, 'id' | 'createdAt'> & { id?: string }): AuditLog {
    const id = log.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    execute(
      `INSERT INTO audit_logs (id, tenant_id, actor_type, actor_id, action, entity_type, entity_id, before_data, after_data, reason, correlation_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, log.tenantId, log.actorType, log.actorId || null, log.action, log.entityType, log.entityId, log.before ? JSON.stringify(log.before) : null, log.after ? JSON.stringify(log.after) : null, log.reason || null, log.correlationId || null]
    );
    const r = queryOne<any>('SELECT * FROM audit_logs WHERE id = ?', [id])!;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      actorType: r.actor_type,
      actorId: r.actor_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      before: JSON.parse(r.before_data || 'null'),
      after: JSON.parse(r.after_data || 'null'),
      reason: r.reason,
      correlationId: r.correlation_id,
      createdAt: r.created_at,
    };
  },
  findAll(tenantId: string, limit: number = 50): any[] {
    const rows = queryAll<any>('SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?', [tenantId, limit]);
    return rows.map((r) => ({
      ...r,
      before: JSON.parse(r.before_data || 'null'),
      after: JSON.parse(r.after_data || 'null'),
    }));
  },
};
