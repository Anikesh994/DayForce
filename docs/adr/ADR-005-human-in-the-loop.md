# ADR-005: Human-in-the-Loop (HITL) for Consequential Attendance Modifications

## Status
Accepted

## Date
2026-11-18

## Context
Modifying an employee's official attendance record impacts wages, compliance reporting, and disciplinary standing. Automated modification without explicit human authorization introduces legal, regulatory, and employee trust vulnerabilities.

## Decision
Mandate human authorization for all consequential timecard modifications:
1. When an exception resolution is proposed by AI, an `Approval` record is created with `status: PENDING` and assigned to the authorized Manager or HR Admin.
2. The Inngest workflow enters a durable wait state (`step.waitForEvent`).
3. An authorized manager reviews the proposed change, the original punch data, and the cited policy evidence side-by-side in the Web UI.
4. If approved:
   - The Core API re-validates the user's role and manager relationship scope.
   - The record's `version` is checked to prevent stale concurrent modifications.
   - The modification is executed in an atomic transaction that marks the approval consumed, updates the punch record, and writes an immutable audit log entry.
5. If rejected:
   - The original attendance record remains strictly untouched.
   - The exception is flagged as `REJECTED` or escalated with mandatory rejection comments.

## Alternatives Considered
- **Auto-Resolve with Confidence Thresholds (e.g. >95% confidence):** Rejected for P0 MVP because even high-confidence model inferences can be erroneous or conflict with unspoken employee agreements. Human review provides the definitive safety backstop.

## Consequences
- **Positive:** Complete compliance with labor standards; full accountability; audit trail linking every punch adjustment to a named approver.
- **Negative / Trade-off:** Requires human interaction before a case is resolved, introducing potential latency (mitigated by Inngest durable sleeps and reminder workflows).
