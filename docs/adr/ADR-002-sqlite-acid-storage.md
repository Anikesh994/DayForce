# ADR-002: SQLite as Reliable ACID Data Storage

## Status
Accepted (Revised per Technical Stack Specification)

## Date
2026-11-18

## Context
The technical stack guidelines explicitly approve:
"Data storage: PostgreSQL, SQLite, MongoDB, or Elasticsearch"
Prisma introduces platform-specific binary engine download dependencies that require external network access and can fail in isolated sandbox environments.
Node.js 22 provides native `node:sqlite` (`DatabaseSync`), offering:
1. Zero external binary downloads or compilation steps.
2. Complete SQL relational schema enforcement, foreign key checks, and unique indexes.
3. True ACID transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) for optimistic concurrency and atomic attendance corrections.
4. Fast in-process queries with file-backed persistence (`attendwise.db`) or `:memory:` mode for testing.

## Decision
Use native **SQLite** (`node:sqlite`) for all relational business data:
- Tables: `tenants`, `users`, `employees`, `shifts`, `attendance_records`, `leave_records`, `exception_cases`, `investigations`, `recommendations`, `approvals`, `policy_documents`, `policy_chunks`, `workflow_runs`, `audit_logs`, `notifications`.
- Consequential changes are committed inside SQLite transactions.
- Concurrency conflicts are prevented via SQLite transactions and version checking.

## Alternatives Considered
- **Prisma with PostgreSQL:** Requires Docker daemon and external schema-engine binary downloads.
- **MongoDB:** Lacks native relational schema constraints required for strict T&A audit compliance.

## Consequences
- **Positive:** Zero runtime friction, zero external downloads, 100% compliant with challenge technical stack rules, ultra-fast test execution.
