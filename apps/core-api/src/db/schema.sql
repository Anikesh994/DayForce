-- AttendWise AI — SQLite Relational Schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  auth_provider_id TEXT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE', -- EMPLOYEE, MANAGER, HR_ADMIN, SYSTEM_ADMIN
  is_active INTEGER NOT NULL DEFAULT 1,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT UNIQUE REFERENCES users(id),
  employee_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  manager_employee_id TEXT REFERENCES employees(id),
  location TEXT NOT NULL DEFAULT 'New York, NY',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  employment_status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, TERMINATED, ON_LEAVE
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_dept ON employees(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_employee_id);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  local_date TEXT NOT NULL, -- YYYY-MM-DD
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  scheduled_start_utc TEXT NOT NULL,
  scheduled_end_utc TEXT NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 30,
  shift_type TEXT NOT NULL DEFAULT 'REGULAR', -- REGULAR, OVERNIGHT, ON_CALL
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shifts_emp_date ON shifts(tenant_id, employee_id, local_date);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  shift_id TEXT REFERENCES shifts(id),
  clock_in_utc TEXT,
  clock_out_utc TEXT,
  source TEXT NOT NULL DEFAULT 'WEB_CLOCK',
  status TEXT NOT NULL DEFAULT 'RECORDED',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance_records(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON attendance_records(shift_id);

CREATE TABLE IF NOT EXISTS leave_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPROVED',
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leave_emp_dates ON leave_records(employee_id, start_utc, end_utc);

CREATE TABLE IF NOT EXISTS exception_cases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  shift_id TEXT REFERENCES shifts(id),
  attendance_record_id TEXT REFERENCES attendance_records(id),
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'DETECTED',
  dedupe_key TEXT NOT NULL UNIQUE,
  facts_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  assigned_manager_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exception_cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_exceptions_manager ON exception_cases(assigned_manager_id, status);

CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  exception_id TEXT NOT NULL REFERENCES exception_cases(id),
  workflow_run_id TEXT,
  summary TEXT NOT NULL,
  confirmed_facts_json TEXT NOT NULL,
  missing_info_json TEXT NOT NULL,
  conflicts_json TEXT NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0.85,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_investigations_exc ON investigations(exception_id);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  exception_id TEXT NOT NULL REFERENCES exception_cases(id),
  investigation_id TEXT REFERENCES investigations(id),
  recommendation_type TEXT NOT NULL,
  proposed_action TEXT NOT NULL,
  proposed_changes_json TEXT NOT NULL,
  rationale TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  citations_json TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recommendations_exc ON recommendations(exception_id, status);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  exception_id TEXT NOT NULL REFERENCES exception_cases(id),
  recommendation_id TEXT NOT NULL REFERENCES recommendations(id),
  approval_idempotency_key TEXT NOT NULL UNIQUE,
  required_role TEXT NOT NULL DEFAULT 'MANAGER',
  assigned_approver_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  decision TEXT,
  decision_comment TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  decided_at TEXT,
  case_version INTEGER NOT NULL DEFAULT 1,
  consumed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(tenant_id, assigned_approver_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_exc ON approvals(exception_id);

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
  ingestion_status TEXT NOT NULL DEFAULT 'READY',
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
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON policy_chunks(document_id);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  exception_id TEXT REFERENCES exception_cases(id),
  workflow_type TEXT NOT NULL,
  inngest_run_id TEXT UNIQUE,
  function_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  current_stage TEXT NOT NULL DEFAULT 'INITIALIZED',
  last_error_code TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_runs(tenant_id, status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  actor_type TEXT NOT NULL, -- USER, SYSTEM, WORKFLOW
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  correlation_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(tenant_id, created_at);

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
  status TEXT NOT NULL DEFAULT 'UNREAD',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(recipient_user_id, status);
