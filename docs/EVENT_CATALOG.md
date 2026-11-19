# AttendWise AI — Inngest Event Catalog

This document defines the standard domain events used across AttendWise AI. Every event payload is versioned, strongly typed, and includes correlation tracking.

---

## Event Schema Structure

All events share the following common envelope fields:
- `name`: string (namespaced domain identifier)
- `data`:
  - `tenantId`: string (unique tenant identifier)
  - `correlationId`: string (UUID tracking end-to-end request lifecycle)
  - `timestamp`: string (ISO 8601 UTC)
  - Additional domain-specific fields

---

## 1. Attendance Domain Events

### `attendance/import.requested`
Triggered when a bulk punch file (CSV/JSON) is uploaded for ingestion.
```json
{
  "name": "attendance/import.requested",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "importBatchId": "batch-20261118-01",
    "fileStorageKey": "imports/punches-2026-11-18.csv",
    "requestedByUserId": "user-hr-admin-01",
    "timestamp": "2026-11-18T08:00:00Z"
  }
}
```

### `attendance/records.imported`
Emitted once an import batch has been parsed, validated, and persisted.
```json
{
  "name": "attendance/records.imported",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "importBatchId": "batch-20261118-01",
    "recordsProcessed": 142,
    "recordsValid": 139,
    "recordsQuarantined": 3,
    "timestamp": "2026-11-18T08:00:15Z"
  }
}
```

### `attendance/scan.requested`
Triggers the deterministic rule engine scan across shifts and attendance records for a specified date range.
```json
{
  "name": "attendance/scan.requested",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "startDate": "2026-11-18",
    "endDate": "2026-11-18",
    "departmentId": null,
    "timestamp": "2026-11-18T08:00:20Z"
  }
}
```

### `attendance/exception.detected`
Emitted by the deterministic rule engine when an anomaly is discovered or updated.
```json
{
  "name": "attendance/exception.detected",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "exceptionId": "exc-missing-clock-out-001",
    "dedupeKey": "exc:tenant-demo-001:emp-001:shift-101:MISSING_CLOCK_OUT",
    "employeeId": "emp-001",
    "shiftId": "shift-101",
    "attendanceRecordId": "rec-501",
    "exceptionType": "MISSING_CLOCK_OUT",
    "severity": "MEDIUM",
    "facts": {
      "scheduledStartUtc": "2026-11-18T09:00:00Z",
      "scheduledEndUtc": "2026-11-18T17:00:00Z",
      "actualClockInUtc": "2026-11-18T08:58:00Z",
      "actualClockOutUtc": null,
      "gracePeriodMinutes": 15,
      "scanTimeUtc": "2026-11-18T17:45:00Z"
    },
    "timestamp": "2026-11-18T17:45:05Z"
  }
}
```

### `attendance/approval.requested`
Emitted when the AI resolution planner finishes its grounded recommendation and requires human sign-off.
```json
{
  "name": "attendance/approval.requested",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "approvalId": "appr-7701",
    "exceptionId": "exc-missing-clock-out-001",
    "recommendationId": "rec-9901",
    "requiredRole": "MANAGER",
    "assignedApproverId": "user-mgr-sarah",
    "proposedAction": "ADJUST_CLOCK_OUT",
    "proposedClockOutUtc": "2026-11-18T17:00:00Z",
    "expiresAt": "2026-11-20T17:00:00Z",
    "timestamp": "2026-11-18T17:45:30Z"
  }
}
```

### `attendance/approval.decision-submitted`
Emitted by the Core API when an authorized manager submits a decision via the UI.
This event resumes the waiting Inngest durable workflow via `step.waitForEvent`.
```json
{
  "name": "attendance/approval.decision-submitted",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "approvalId": "appr-7701",
    "exceptionId": "exc-missing-clock-out-001",
    "decision": "APPROVE",
    "decisionComment": "Verified employee worked till regular shift completion per badge swipe.",
    "decidedByUserId": "user-mgr-sarah",
    "decidedAt": "2026-11-18T18:15:00Z"
  }
}
```

### `attendance/correction.applied`
Emitted after the Core API has committed the database transaction modifying the official attendance record.
```json
{
  "name": "attendance/correction.applied",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "exceptionId": "exc-missing-clock-out-001",
    "attendanceRecordId": "rec-501",
    "approvalId": "appr-7701",
    "idempotencyKey": "corr:exc-missing-clock-out-001:rec-9901:appr-7701",
    "previousClockOutUtc": null,
    "newClockOutUtc": "2026-11-18T17:00:00Z",
    "appliedByUserId": "user-mgr-sarah",
    "timestamp": "2026-11-18T18:15:02Z"
  }
}
```

### `attendance/exception.resolved`
Emitted when an exception case completes its entire lifecycle.
```json
{
  "name": "attendance/exception.resolved",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-1234",
    "exceptionId": "exc-missing-clock-out-001",
    "resolutionOutcome": "CORRECTED",
    "resolvedAt": "2026-11-18T18:15:05Z"
  }
}
```

---

## 2. Policy & Knowledge Domain Events

### `knowledge/document.uploaded`
Triggers chunking, embedding, and vector upsert into Qdrant.
```json
{
  "name": "knowledge/document.uploaded",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-5678",
    "documentId": "doc-policy-timekeeping-v1",
    "title": "Corporate Timekeeping & Attendance Policy",
    "category": "ATTENDANCE_RULES",
    "version": "1.0",
    "storageKey": "policies/timekeeping_policy_v1.pdf",
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null,
    "timestamp": "2026-11-18T09:00:00Z"
  }
}
```

### `knowledge/document.indexed`
Emitted once all chunks have been embedded and upserted into Qdrant.
```json
{
  "name": "knowledge/document.indexed",
  "data": {
    "tenantId": "tenant-demo-001",
    "correlationId": "corr-uuid-5678",
    "documentId": "doc-policy-timekeeping-v1",
    "chunksIndexed": 18,
    "timestamp": "2026-11-18T09:00:12Z"
  }
}
```

---

## 3. System & Notification Events

### `notification/requested`
Emitted when a user notification must be generated.
```json
{
  "name": "notification/requested",
  "data": {
    "tenantId": "tenant-demo-001",
    "recipientUserId": "user-mgr-sarah",
    "type": "APPROVAL_REQUIRED",
    "title": "Attendance Approval Required",
    "body": "Employee Marcus Vance has an unresolved Missing Clock-Out exception.",
    "relatedEntityType": "EXCEPTION_CASE",
    "relatedEntityId": "exc-missing-clock-out-001",
    "idempotencyKey": "notif:appr-7701:user-mgr-sarah",
    "timestamp": "2026-11-18T17:45:35Z"
  }
}
```
