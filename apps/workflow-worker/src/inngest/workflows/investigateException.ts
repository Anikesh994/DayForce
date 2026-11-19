import { inngest } from '../client.js';
import { NonRetriableError } from 'inngest';

const CORE_API  = process.env.CORE_API_URL  || 'http://localhost:3001';
const AI_SVC    = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const SVC_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-secret-internal-service-token-1234';
const APPROVAL_TTL_HOURS = 48;

async function coreGet(path: string) {
  const res = await fetch(`${CORE_API}${path}`, {
    headers: { Authorization: `Bearer ${SVC_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Core API ${path} → ${res.status}`);
  return res.json();
}

async function corePost(path: string, body: unknown) {
  const res = await fetch(`${CORE_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SVC_TOKEN}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Core API POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function aiPost(path: string, body: unknown) {
  const res = await fetch(`${AI_SVC}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SVC_TOKEN}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Service POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Workflow: Investigate Exception ──────────────────────────────────────────
export const investigateExceptionFn = inngest.createFunction(
  {
    id: 'attendwise-investigate-exception',
    name: 'Investigate Attendance Exception',
    concurrency: { limit: 5 },
    retries: 3,
  },
  [
    { event: 'attendance/exception.detected' },
    { event: 'attendance/exception.investigation.requested' },
  ],
  async ({ event, step }) => {
    const { tenantId, exceptionId, correlationId } = event.data as any;

    if (!exceptionId) throw new NonRetriableError('Missing exceptionId in event payload');

    // ── Step 1: Load case data ───────────────────────────────────────────────
    const caseData = await step.run('load-case-data', async () => {
      const data = await coreGet(`/api/v1/exceptions/${exceptionId}`);
      const exc  = data.exception;
      if (!exc) throw new NonRetriableError(`Exception ${exceptionId} not found`);
      if (['RESOLVED', 'CANCELLED'].includes(exc.status)) {
        throw new NonRetriableError(`Exception ${exceptionId} is already ${exc.status}`);
      }
      return data;
    });

    // ── Step 2: Set status to INVESTIGATING ──────────────────────────────────
    await step.run('set-investigating', async () => {
      // We update via a direct DB call through core api — post a status update
      // For demo we publish an event the core API listens to; here we call a
      // workflow-internal status endpoint if available, otherwise continue.
      try {
        await fetch(`${CORE_API}/api/v1/exceptions/${exceptionId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SVC_TOKEN}` },
          body: JSON.stringify({ status: 'INVESTIGATING' }),
        });
      } catch {
        // non-critical — continue workflow
      }
    });

    // ── Step 3: Run AI investigation (LangGraph pipeline) ───────────────────
    const aiResult = await step.run('run-ai-investigation', async () => {
      const { exception: exc, investigation: existingInv } = caseData;
      const empRes = await coreGet(`/api/v1/employees/${exc.employee_id}`);

      // Fetch policy chunks to pass as context (for in-memory Qdrant seeding)
      let policyChunks: any[] = [];
      try {
        const policyRes = await coreGet(`/internal/policies?tenantId=${tenantId}`);
        policyChunks = policyRes.chunks || [];
      } catch { /* optional */ }

      const payload = {
        exception_id:       exceptionId,
        tenant_id:          tenantId,
        exception_type:     exc.exception_type,
        severity:           exc.severity,
        facts:              exc.facts || {},
        employee:           empRes.employee || {},
        shift:              { scheduled_start_utc: exc.scheduled_start_utc, scheduled_end_utc: exc.scheduled_end_utc, id: exc.shift_id },
        attendance_record:  { id: exc.attendance_record_id, clock_in_utc: exc.clock_in_utc, clock_out_utc: exc.clock_out_utc, version: exc.attendanceVersion },
        recent_history:     [],
        leave_records:      [],
        policy_chunks:      policyChunks,
      };

      return aiPost('/internal/v1/investigate', payload);
    });

    // ── Step 4: Persist investigation + recommendation ───────────────────────
    const persistResult = await step.run('persist-results', async () => {
      return corePost('/api/v1/workflow/persist-investigation', {
        exceptionId,
        tenantId,
        correlationId,
        investigation:  aiResult.investigation,
        policyEvidence: aiResult.policy_evidence,
        recommendation: aiResult.recommendation,
        reviewerVerdict: aiResult.reviewer_verdict,
      });
    });

    // ── Step 5: Create approval request ─────────────────────────────────────
    const approval = await step.run('create-approval', async () => {
      const rec    = aiResult.recommendation;
      const expiry = new Date(Date.now() + APPROVAL_TTL_HOURS * 3600000).toISOString();

      return corePost('/api/v1/workflow/create-approval', {
        exceptionId,
        tenantId,
        correlationId,
        recommendationId:   persistResult.recommendationId,
        requiredRole:       rec.required_approver_role,
        proposedAction:     rec.proposed_action,
        expiresAt:          expiry,
      });
    });

    // ── Step 6: Wait for human approval (up to 48h) ─────────────────────────
    const decisionEvent = await step.waitForEvent('wait-for-approval-decision', {
      event:   'attendance/approval.decision-submitted',
      timeout: `${APPROVAL_TTL_HOURS}h`,
      match:   'data.approvalId',
    });

    // ── Step 7: Handle approval outcome ─────────────────────────────────────
    if (!decisionEvent) {
      await step.run('handle-timeout', async () => {
        return corePost('/api/v1/workflow/approval-timeout', {
          exceptionId,
          tenantId,
          approvalId: approval.approvalId,
          correlationId,
        });
      });
      return { outcome: 'EXPIRED', exceptionId };
    }

    const { decision, decisionComment, decidedByUserId } = decisionEvent.data as any;

    await step.run('finalize-decision', async () => {
      return corePost('/api/v1/workflow/finalize-decision', {
        exceptionId,
        tenantId,
        approvalId:      approval.approvalId,
        decision,
        decisionComment,
        decidedByUserId,
        correlationId,
        recommendation:  aiResult.recommendation,
        attendanceRecordId: caseData.exception?.attendance_record_id,
        attendanceVersion:  caseData.exception?.attendanceVersion,
      });
    });

    return { outcome: decision, exceptionId };
  }
);
