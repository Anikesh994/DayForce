import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? path.join(__dirname, '../../dev.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export function initSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      auth_provider_id TEXT,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('EMPLOYEE','MANAGER','HR_ADMIN','SYSTEM_ADMIN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT REFERENCES users(id),
      employee_code TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      manager_employee_id TEXT REFERENCES employees(id),
      location TEXT NOT NULL DEFAULT 'HQ',
      timezone TEXT NOT NULL DEFAULT 'America/New_York',
      employment_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(employment_status IN ('ACTIVE','TERMINATED','ON_LEAVE')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, employee_code)
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      employee_id TEXT NOT NULL REFERENCES employees(id),
      local_date TEXT NOT NULL,
      timezone TEXT NOT NULL,
      scheduled_start_utc TEXT NOT NULL,
      scheduled_end_utc TEXT NOT NULL,
      break_minutes INTEGER NOT NULL DEFAULT 30,
      shift_type TEXT NOT NULL DEFAULT 'REGULAR' CHECK(shift_type IN ('REGULAR','OVERNIGHT','ON_CALL')),
      status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','COMPLETED','CANCELLED')),
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_shifts_employee_date ON shifts(employee_id, local_date);

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      employee_id TEXT NOT NULL REFERENCES employees(id),
      shift_id TEXT REFERENCES shifts(id),
      clock_in_utc TEXT,
      clock_out_utc TEXT,
      source TEXT NOT NULL DEFAULT 'WEB_CLOCK' CHECK(source IN ('WEB_CLOCK','MOBILE','BADGE_SWIPE','SYSTEM_ADJUSTMENT')),
      status TEXT NOT NULL DEFAULT 'RECORDED' CHECK(status IN ('RECORDED','FLAGGED','RESOLVED','VERIFIED')),
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_shift ON attendance_records(shift_id);

    CREATE TABLE IF NOT EXISTS leave_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      employee_id TEXT NOT NULL REFERENCES employees(id),
      start_utc TEXT NOT NULL,
      end_utc TEXT NOT NULL,
      leave_type TEXT NOT NULL CHECK(leave_type IN ('SICK','VACATION','PERSONAL','BEREAVEMENT')),
      status TEXT NOT NULL DEFAULT 'APPROVED' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
      approved_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exception_cases (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      employee_id TEXT NOT NULL REFERENCES employees(id),
      shift_id TEXT REFERENCES shifts(id),
      attendance_record_id TEXT REFERENCES attendance_records(id),
      exception_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH')),
      status TEXT NOT NULL DEFAULT 'DETECTED',
      dedupe_key TEXT NOT NULL,
      facts TEXT NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL DEFAULT 1,
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      assigned_manager_id TEXT REFERENCES employees(id),
      UNIQUE(dedupe_key)
    );

    CREATE INDEX IF NOT EXISTS idx_exceptions_employee ON exception_cases(employee_id);
    CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exception_cases(status);
    CREATE INDEX IF NOT EXISTS idx_exceptions_tenant ON exception_cases(tenant_id);

    CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      exception_id TEXT NOT NULL REFERENCES exception_cases(id),
      workflow_run_id TEXT,
      summary TEXT NOT NULL,
      confirmed_facts TEXT NOT NULL DEFAULT '[]',
      missing_info TEXT NOT NULL DEFAULT '[]',
      conflicts TEXT NOT NULL DEFAULT '[]',
      confidence_score REAL NOT NULL DEFAULT 0.5,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      exception_id TEXT NOT NULL REFERENCES exception_cases(id),
      investigation_id TEXT REFERENCES investigations(id),
      recommendation_type TEXT NOT NULL,
      proposed_action TEXT NOT NULL,
      proposed_changes TEXT NOT NULL DEFAULT '[]',
      rationale TEXT NOT NULL,
      supporting_facts TEXT NOT NULL DEFAULT '[]',
      policy_citations TEXT NOT NULL DEFAULT '[]',
      uncertainty_explanation TEXT,
      confidence_score REAL NOT NULL DEFAULT 0.5,
      required_approver_role TEXT NOT NULL DEFAULT 'MANAGER',
      requires_employee_confirmation INTEGER NOT NULL DEFAULT 0,
      risk_level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(risk_level IN ('LOW','MEDIUM','HIGH')),
      questions_or_missing_evidence TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      exception_id TEXT NOT NULL REFERENCES exception_cases(id),
      recommendation_id TEXT NOT NULL REFERENCES recommendations(id),
      approval_idempotency_key TEXT NOT NULL UNIQUE,
      required_role TEXT NOT NULL,
      assigned_approver_id TEXT REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','EXPIRED','CONSUMED')),
      decision TEXT CHECK(decision IN ('APPROVE','REJECT','REQUEST_MORE_INFO')),
      decision_comment TEXT,
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      decided_at TEXT,
      case_version INTEGER NOT NULL DEFAULT 1,
      consumed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_approvals_exception ON approvals(exception_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
    CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(assigned_approver_id);

    CREATE TABLE IF NOT EXISTS policy_documents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0',
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      location TEXT NOT NULL DEFAULT 'ALL',
      storage_key TEXT NOT NULL,
      checksum TEXT NOT NULL,
      ingestion_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(ingestion_status IN ('PENDING','PROCESSING','READY','FAILED')),
      uploaded_by TEXT,
      content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS policy_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES policy_documents(id),
      chunk_index INTEGER NOT NULL,
      page INTEGER,
      section TEXT NOT NULL,
      text_snippet TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      qdrant_point_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      exception_id TEXT REFERENCES exception_cases(id),
      workflow_type TEXT NOT NULL,
      inngest_run_id TEXT,
      function_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'INITIALIZED',
      current_stage TEXT NOT NULL DEFAULT 'STARTED',
      last_error_code TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      actor_type TEXT NOT NULL CHECK(actor_type IN ('USER','SYSTEM','WORKFLOW')),
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_data TEXT,
      after_data TEXT,
      reason TEXT,
      correlation_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      recipient_user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      related_entity_type TEXT,
      related_entity_id TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'UNREAD' CHECK(status IN ('UNREAD','READ')),
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, status);
  `);

  const compatibilityMigrations = [
    'ALTER TABLE policy_chunks ADD COLUMN metadata_json TEXT',
    'ALTER TABLE exception_cases ADD COLUMN facts_json TEXT',
    'ALTER TABLE investigations ADD COLUMN confirmed_facts_json TEXT',
    'ALTER TABLE investigations ADD COLUMN missing_info_json TEXT',
    'ALTER TABLE investigations ADD COLUMN conflicts_json TEXT',
    'ALTER TABLE recommendations ADD COLUMN proposed_changes_json TEXT',
    'ALTER TABLE recommendations ADD COLUMN citations_json TEXT',
    'ALTER TABLE recommendations ADD COLUMN evidence_json TEXT',
    'ALTER TABLE audit_logs ADD COLUMN before_json TEXT',
    'ALTER TABLE audit_logs ADD COLUMN after_json TEXT',
  ];

  for (const sql of compatibilityMigrations) {
    try {
      db.exec(sql + ';');
    } catch (_) {
      // Column already exists or already up-to-date
    }
  }
}
