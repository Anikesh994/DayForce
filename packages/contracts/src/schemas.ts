import { z } from 'zod';

// ── Shared Sub-schemas ────────────────────────────────────────────────────────

export const PolicyCitationSchema = z.object({
  documentId: z.string(),
  documentTitle: z.string(),
  section: z.string(),
  page: z.number().optional(),
  chunkId: z.string(),
  snippet: z.string(),
  relevanceExplanation: z.string(),
});

export const ProposedChangeSchema = z.object({
  field: z.string(),
  currentValue: z.any(),
  proposedValue: z.any(),
  rationale: z.string().min(1, 'Rationale must be provided for every proposed change'),
});

// ── Exception & Approval Input Schemas ───────────────────────────────────────

export const ApprovalDecisionInputSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_MORE_INFO']),
  decisionComment: z.string().optional(),
});

export const AttendanceScanInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  departmentId: z.string().optional(),
});

export const ExceptionQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  severity: z.string().optional(),
  employeeId: z.string().optional(),
  managerId: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

// ── AI Harness Contracts (Pydantic / Zod Mirrors) ───────────────────────────

export const InvestigationResultSchema = z.object({
  summary: z.string().min(10),
  confirmedFacts: z.array(z.string()),
  missingInformation: z.array(z.string()),
  conflictingEvidence: z.array(z.string()).default([]),
  relevantRecordIds: z.array(z.string()).default([]),
  suggestedFollowUpQuestions: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0.0).max(1.0),
  uncertaintyExplanation: z.string().default(''),
});

export const PolicyRetrievalResultSchema = z.object({
  retrievedSources: z.array(PolicyCitationSchema),
  relevantPolicyRules: z.array(z.string()),
  citations: z.array(PolicyCitationSchema),
  applicabilityNotes: z.array(z.string()),
  conflicts: z.array(z.string()).default([]),
  insufficientEvidence: z.boolean().default(false),
});

export const RecommendationResultSchema = z.object({
  recommendationType: z.string(),
  proposedAction: z.string().min(5),
  proposedChanges: z.array(ProposedChangeSchema),
  rationale: z.string().min(10),
  supportingFacts: z.array(z.string()),
  policyCitations: z.array(PolicyCitationSchema),
  uncertaintyExplanation: z.string().default(''),
  confidenceScore: z.number().min(0.0).max(1.0),
  requiredApproverRole: z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN']),
  requiresEmployeeConfirmation: z.boolean(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  questionsOrMissingEvidence: z.array(z.string()).default([]),
});

export const FullInvestigationResponseSchema = z.object({
  exceptionId: z.string(),
  investigation: InvestigationResultSchema,
  policyEvidence: PolicyRetrievalResultSchema,
  recommendation: RecommendationResultSchema,
  reviewerVerdict: z.enum(['PASS', 'NEEDS_REVISION', 'ESCALATE']),
  reviewerIssues: z.array(z.string()).default([]),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type PolicyCitationInput = z.infer<typeof PolicyCitationSchema>;
export type ProposedChangeInput = z.infer<typeof ProposedChangeSchema>;
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionInputSchema>;
export type AttendanceScanInput = z.infer<typeof AttendanceScanInputSchema>;
export type ExceptionQuery = z.infer<typeof ExceptionQuerySchema>;
export type InvestigationResultContract = z.infer<typeof InvestigationResultSchema>;
export type PolicyRetrievalResultContract = z.infer<typeof PolicyRetrievalResultSchema>;
export type RecommendationResultContract = z.infer<typeof RecommendationResultSchema>;
export type FullInvestigationResponseContract = z.infer<typeof FullInvestigationResponseSchema>;

// ── Harness Guardrails & Validation Functions ─────────────────────────────────

/**
 * Whitelist of allowable fields that AI agents are permitted to propose changes to.
 * Strictly prevents AI from modifying financial data, salary, roles, or unauthorized columns.
 */
export const ALLOWED_TIMECARD_MUTATION_FIELDS = [
  'clock_in_utc',
  'clock_out_utc',
  'worked_hours',
  'break_duration_mins',
] as const;

export const STRICT_FORBIDDEN_MUTATION_FIELDS = [
  'salary',
  'hourly_rate',
  'bank_account',
  'tax_id',
  'role',
  'department',
  'manager_id',
  'tenant_id',
  'is_active',
] as const;

export interface GuardrailCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Validates proposed changes against strict enterprise guardrails.
 */
export function validateProposedChangesGuardrail(
  changes: Array<{ field: string; proposedValue: any; rationale?: string }>
): GuardrailCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  for (const c of changes) {
    // 1. Check forbidden fields
    if (STRICT_FORBIDDEN_MUTATION_FIELDS.includes(c.field as any)) {
      violations.push(`GUARDRAIL_VIOLATION: AI attempted to modify prohibited sensitive field '${c.field}'.`);
    }

    // 2. Check whitelist
    if (!ALLOWED_TIMECARD_MUTATION_FIELDS.includes(c.field as any)) {
      violations.push(`UNAUTHORIZED_FIELD: Field '${c.field}' is not in the permitted timecard mutation whitelist.`);
    }

    // 3. Ensure non-empty rationale
    if (!c.rationale || c.rationale.trim().length === 0) {
      violations.push(`MISSING_RATIONALE: Proposed modification to '${c.field}' lacks a documented rationale.`);
    }

    // 4. Timestamp format validation for clock fields
    if ((c.field === 'clock_in_utc' || c.field === 'clock_out_utc') && c.proposedValue) {
      const isValidDate = !isNaN(Date.parse(c.proposedValue));
      if (!isValidDate) {
        violations.push(`INVALID_TIMESTAMP: Value '${c.proposedValue}' for '${c.field}' is not a valid ISO date.`);
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Validates that all citations generated by the AI correspond to known, retrieved policy chunks.
 * Catches hallucinations where an LLM invents a non-existent document or chunk ID.
 */
export function validateCitationGroundingGuardrail(
  citations: Array<{ chunkId: string; documentTitle?: string }>,
  availableChunkIds: string[]
): GuardrailCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  const knownSet = new Set(availableChunkIds);

  for (const cit of citations) {
    if (!cit.chunkId) {
      violations.push('CITATION_UNGROUNDED: Citation missing chunk_id identifier.');
      continue;
    }
    // If availableChunkIds are populated, verify chunk existence
    if (knownSet.size > 0 && !knownSet.has(cit.chunkId)) {
      violations.push(`HALLUCINATED_CITATION: Citation chunk '${cit.chunkId}' was not found in retrieved policy documents.`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Validates Human-in-the-Loop decision requirements.
 * Rejections strictly mandate an explanation to preserve transparency and auditability.
 */
export function validateHumanDecisionGuardrail(
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO',
  comment?: string
): GuardrailCheckResult {
  const violations: string[] = [];

  if (decision === 'REJECT' && (!comment || comment.trim().length < 5)) {
    violations.push('MANDATORY_JUSTIFICATION: Rejections require a clear explanation (minimum 5 characters) for employee feedback.');
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings: [],
  };
}
