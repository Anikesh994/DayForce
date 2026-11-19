# AttendWise AI — REST API Specification

Version: 1.0.0
Base URL: `http://localhost:3001/api/v1`

All responses follow standard HTTP status codes and JSON envelope format:
- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "success": false, "error": { "code": "STRING_CODE", "message": "Human readable detail" } }`

---

## 1. Authentication & Context
- `GET /me`
  - Headers: `Authorization: Bearer <token>` or `x-demo-user-id: <user_id>` (in dev mode)
  - Returns authenticated user profile, tenant ID, and RBAC role (`EMPLOYEE`, `MANAGER`, `HR_ADMIN`, `SYSTEM_ADMIN`).
- `GET /users` (HR_ADMIN, SYSTEM_ADMIN)
  - Returns list of seeded demo users for rapid role-switching.

## 2. Employees & Hierarchy
- `GET /employees`
  - Query parameters: `department`, `location`, `managerId`, `search`, `page`, `limit`
  - Returns list of employees with department, job title, and manager hierarchy.
- `GET /employees/:id`
  - Returns full employee profile, assigned shifts, and recent attendance summaries.

## 3. Shifts & Schedules
- `GET /shifts`
  - Query parameters: `employeeId`, `startDate`, `endDate`, `status`
  - Returns shifts including `scheduledStartUtc`, `scheduledEndUtc`, `timezone`, and `breakMinutes`.
- `POST /shifts` (HR_ADMIN)
  - Create a new shift schedule.

## 4. Attendance & Punches
- `GET /attendance`
  - Query parameters: `employeeId`, `startDate`, `endDate`, `status`, `hasException`
  - Returns punch records with `clockInUtc`, `clockOutUtc`, worked duration, and anomaly indicators.
- `POST /attendance/import` (HR_ADMIN)
  - Accepts CSV/JSON punch rows, validates records, triggers `attendance/records.imported`.
- `POST /attendance/scan` (HR_ADMIN / SYSTEM_ADMIN)
  - Triggers the deterministic exception scan engine for a specified date range.

## 5. Exceptions & Investigations
- `GET /exceptions`
  - Query parameters: `status`, `type`, `severity`, `employeeId`, `managerId`, `page`, `limit`
  - Returns paginated list of workforce exceptions.
- `GET /exceptions/:id`
  - Returns exception facts, linked shift, actual punches, timeline, and AI investigation data.
- `POST /exceptions/:id/investigate` (MANAGER, HR_ADMIN)
  - Triggers on-demand AI investigation workflow via Inngest.

## 6. Approvals (Human-in-the-Loop)
- `GET /approvals/pending` (MANAGER, HR_ADMIN)
  - Returns pending approval tasks assigned to the caller (or company-wide for HR_ADMIN).
  - Includes proposed action, before/after diffs, and cited policy clauses.
- `POST /approvals/:id/decision` (MANAGER, HR_ADMIN)
  - Request body:
    ```json
    {
      "decision": "APPROVE" | "REJECT" | "REQUEST_MORE_INFO",
      "decisionComment": "Reason for decision..."
    }
    ```
  - Resumes the waiting Inngest durable workflow and applies transactional corrections.

## 7. Knowledge Base & Policies
- `GET /knowledge/documents`
  - Returns uploaded policy documents, categories, versions, and indexing statuses.
- `POST /knowledge/documents` (HR_ADMIN)
  - Upload a new policy document for chunking and Qdrant vector indexing.
- `POST /knowledge/documents/:id/reindex` (HR_ADMIN)
  - Re-triggers vector embedding and index generation.

## 8. Audit & Monitoring
- `GET /audit` (HR_ADMIN, SYSTEM_ADMIN)
  - Query parameters: `entityType`, `entityId`, `actorId`, `startDate`, `endDate`
  - Returns immutable audit logs with before/after state snapshots.
- `GET /workflows/:inngestRunId` (SYSTEM_ADMIN)
  - Returns execution status and step timeline of an Inngest durable run.
