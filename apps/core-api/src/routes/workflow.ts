/**
 * Internal workflow routes — called only by the Inngest workflow worker.
 * Protected by INTERNAL_SERVICE_TOKEN, not JWT.
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, execute, transaction } from '../db/index.js';

const router = Router();

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-secret-internal-service-token-1234';

function verifyInternal(req: Request, res: Response): boolean {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${INTERNAL_TOKEN}`) {
    res.status(401).json({ error: 'Invalid internal service token' });
    return false;
  }
  return true;
}

// PATCH /api/v1/exceptions/:id/status  — workflow status updates
router.patch('/exceptions/:id/status', (req: Request, res: Response): void => {
  if (!verifyInternal(req, res)) return;
  const { status } = req.body;
  execute('UPDATE exception_cases SET status = ?, version = version + 1 WHERE id = ?', [status, req.params.id]);
  res.json({ updated: true });
});

// POST /api/v1/workflow/persist-investigation
router.post('/workflow/persist-investigation', (req: Request, res: Response): void => {
  if (!verifyInternal(req, res)) return;

  const { exceptionId, tenantId, correlationId, investigation, recommendation, reviewerVerdict } = req.body;

  const invId = `inv-${uuidv4().substring(0, 8)}`;
  const recId = `rec-${uuidv4().substring(0, 8)}`;

  try {
    // Save investigation
    const confirmedJson = JSON.stringify(investigation.confirmed_facts || []);
    const missingJson = JSON.stringify(investigation.missing_information || []);
    const conflictsJson = JSON.stringify(investigation.conflicting_evidence || []);

    execute(
      `INSERT OR REPLACE INTO investigations
         (id, exception_id, workflow_run_id, summary, confirmed_facts, confirmed_facts_json, missing_info, missing_info_json, conflicts, conflicts_json, confidence_score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        invId, exceptionId, correlationId,
        investigation.summary,
        confirmedJson, confirmedJson,
        missingJson, missingJson,
        conflictsJson, conflictsJson,
        investigation.confidence_score || 0.5,
      ]
    );

    // Save recommendation
    const changesJson = JSON.stringify(recommendation.proposed_changes || []);
    const factsJson = JSON.stringify(recommendation.supporting_facts || []);
    const citationsJson = JSON.stringify(recommendation.policy_citations || []);

    execute(
      `INSERT OR REPLACE INTO recommendations
         (id, exception_id, investigation_id, recommendation_type, proposed_action,
          proposed_changes, proposed_changes_json, rationale, supporting_facts, evidence_json, policy_citations, citations_json, risk_level, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'))`,
      [
        recId, exceptionId, invId,
        recommendation.recommendation_type,
        recommendation.proposed_action,
        changesJson, changesJson,
        recommendation.rationale,
        factsJson, factsJson,
        citationsJson, citationsJson,
        recommendation.risk_level || 'MEDIUM',
      ]
    );

    // Update exception status
    execute(
      "UPDATE exception_cases SET status = 'WAITING_FOR_APPROVAL', version = version + 1 WHERE id = ?",
      [exceptionId]
    );

    res.json({ investigationId: invId, recommendationId: recId, reviewerVerdict });
  } catch (err: any) {
    console.error('[workflow] persist-investigation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/workflow/create-approval
router.post('/workflow/create-approval', (req: Request, res: Response): void => {
  if (!verifyInternal(req, res)) return;

  const { exceptionId, tenantId, correlationId, recommendationId, requiredRole, proposedAction, expiresAt } = req.body;

  const approvalId        = `appr-${uuidv4().substring(0, 8)}`;
  const idempotencyKey    = `approval:${exceptionId}:${recommendationId}`;

  // Check if one already exists for idempotency
  const existing = queryOne<any>('SELECT id FROM approvals WHERE approval_idempotency_key = ?', [idempotencyKey]);
  if (existing) {
    res.json({ approvalId: existing.id, message: 'Approval already exists' });
    return;
  }

  const exc = queryOne<any>('SELECT version, assigned_manager_id FROM exception_cases WHERE id = ?', [exceptionId]);

  // Find an assignable manager user
  let assignedApproverId: string | null = null;
  if (exc?.assigned_manager_id) {
    const mgr = queryOne<any>('SELECT id FROM users WHERE id = ? OR id IN (SELECT user_id FROM employees WHERE id = ?)', [exc.assigned_manager_id, exc.assigned_manager_id]);
    assignedApproverId = mgr?.id ?? null;
  }
  if (!assignedApproverId && requiredRole === 'HR_ADMIN') {
    const hr = queryOne<any>("SELECT id FROM users WHERE role = 'HR_ADMIN' LIMIT 1");
    assignedApproverId = hr?.id ?? null;
  }
  if (!assignedApproverId) {
    const mgr = queryOne<any>("SELECT id FROM users WHERE role = 'MANAGER' LIMIT 1");
    assignedApproverId = mgr?.id ?? null;
  }

  execute(
    `INSERT INTO approvals
       (id, tenant_id, exception_id, recommendation_id, approval_idempotency_key,
        required_role, assigned_approver_id, status, requested_at, expires_at, case_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'), ?, ?)`,
    [approvalId, tenantId, exceptionId, recommendationId, idempotencyKey, requiredRole, assignedApproverId, expiresAt, exc?.version || 1]
  );

  // Create in-app notification
  if (assignedApproverId) {
    const notifId = `notif-${uuidv4().substring(0, 8)}`;
    try {
      execute(
        `INSERT OR IGNORE INTO notifications
           (id, tenant_id, recipient_user_id, type, title, body,
            related_entity_type, related_entity_id, idempotency_key, status, created_at)
         VALUES (?, ?, ?, 'APPROVAL_REQUEST', ?, ?, 'ExceptionCase', ?, ?, 'UNREAD', datetime('now'))`,
        [
          notifId, tenantId, assignedApproverId,
          'Attendance Exception Requires Your Approval',
          `An attendance exception requires your review and approval. Proposed action: ${proposedAction?.substring(0, 100)}`,
          exceptionId,
          `notif:${exceptionId}:${approvalId}`,
        ]
      );
    } catch { /* duplicate key — idempotent */ }
  }

  res.json({ approvalId, assignedApproverId });
});

// POST /api/v1/workflow/approval-timeout
router.post('/workflow/approval-timeout', (req: Request, res: Response): void => {
  if (!verifyInternal(req, res)) return;
  const { exceptionId, approvalId } = req.body;

  execute("UPDATE approvals SET status = 'EXPIRED' WHERE id = ?", [approvalId]);
  execute("UPDATE exception_cases SET status = 'ESCALATED', version = version + 1 WHERE id = ?", [exceptionId]);

  res.json({ outcome: 'EXPIRED' });
});

// POST /api/v1/workflow/finalize-decision
router.post('/workflow/finalize-decision', (req: Request, res: Response): void => {
  if (!verifyInternal(req, res)) return;
  const { exceptionId, approvalId, decision, decisionComment, recommendation, attendanceRecordId, attendanceVersion } = req.body;

  try {
    transaction(() => {
      if (decision === 'APPROVE') {
        const proposedChanges: any[] = recommendation?.proposed_changes || [];

        if (proposedChanges.length > 0 && attendanceRecordId) {
          for (const change of proposedChanges) {
            if (change.field === 'clock_out_utc') {
              execute(
                `UPDATE attendance_records
                 SET clock_out_utc = ?, source = 'SYSTEM_ADJUSTMENT', status = 'RESOLVED',
                     version = version + 1, updated_at = datetime('now')
                 WHERE id = ?`,
                [change.proposed_value, attendanceRecordId]
              );
            }
            if (change.field === 'clock_in_utc') {
              execute(
                `UPDATE attendance_records
                 SET clock_in_utc = ?, source = 'SYSTEM_ADJUSTMENT', status = 'RESOLVED',
                     version = version + 1, updated_at = datetime('now')
                 WHERE id = ?`,
                [change.proposed_value, attendanceRecordId]
              );
            }
          }
        }

        execute(
          "UPDATE approvals SET status = 'APPROVED', decision = 'APPROVE', decision_comment = ?, decided_at = datetime('now'), consumed_at = datetime('now') WHERE id = ?",
          [decisionComment || null, approvalId]
        );
        execute(
          "UPDATE exception_cases SET status = 'RESOLVED', resolved_at = datetime('now'), version = version + 1 WHERE id = ?",
          [exceptionId]
        );
      } else if (decision === 'REJECT') {
        execute(
          "UPDATE approvals SET status = 'REJECTED', decision = 'REJECT', decision_comment = ?, decided_at = datetime('now') WHERE id = ?",
          [decisionComment || null, approvalId]
        );
        execute(
          "UPDATE exception_cases SET status = 'REJECTED', version = version + 1 WHERE id = ?",
          [exceptionId]
        );
      } else {
        execute(
          "UPDATE exception_cases SET status = 'NEEDS_MORE_INFO', version = version + 1 WHERE id = ?",
          [exceptionId]
        );
      }
    });

    res.json({ outcome: decision });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /internal/policies — provide policy chunks for AI context
router.get('/internal/policies', (req: Request, res: Response): void => {
  if (!verifyInternal(req, res)) return;
  const chunks = queryAll(
    `SELECT pc.*, pd.title AS document_title, pd.category, pd.tenant_id
     FROM policy_chunks pc
     JOIN policy_documents pd ON pc.document_id = pd.id
     WHERE pd.ingestion_status = 'READY'
     LIMIT 50`
  );
  res.json({ chunks });
});

export default router;
