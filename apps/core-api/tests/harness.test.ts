import { describe, it, expect, beforeAll } from 'vitest';
import {
  InvestigationResultSchema,
  PolicyCitationSchema,
  RecommendationResultSchema,
  FullInvestigationResponseSchema,
  validateProposedChangesGuardrail,
  validateCitationGroundingGuardrail,
  validateHumanDecisionGuardrail,
  ALLOWED_TIMECARD_MUTATION_FIELDS,
  STRICT_FORBIDDEN_MUTATION_FIELDS,
} from '@attendwise/contracts';
import { runInvestigationPipeline } from '../src/domain/investigationRunner.js';
import { queryOne, execute } from '../src/db/index.js';
import { runSeed } from '../src/db/seed.js';

describe('Harness Engineering & Guardrail Governance Suite', () => {
  beforeAll(async () => {
    await runSeed();
  });

  describe('1. Structured Contracts & Schema Enforcement', () => {
    it('validates a compliant full investigation response schema', () => {
      const validPayload = {
        exceptionId: 'exc-001',
        investigation: {
          summary: 'Employee clocked in at 09:15 with 15 minutes of lateness exceeding grace period.',
          confirmedFacts: ['Clock in recorded at 09:15 UTC', 'Scheduled start: 09:00 UTC'],
          missingInformation: ['Supervisor pre-authorization note not found'],
          conflictingEvidence: [],
          relevantRecordIds: ['rec-001'],
          suggestedFollowUpQuestions: ['Was there transport disruption?'],
          confidenceScore: 0.88,
          uncertaintyExplanation: 'Sufficient evidence available.',
        },
        policyEvidence: {
          retrievedSources: [
            {
              documentId: 'pol-001',
              documentTitle: 'Attendance Policy',
              section: '2.1',
              chunkId: 'chunk-001',
              snippet: '10 minute grace period applies.',
              relevanceExplanation: 'Directly governs late arrivals.',
            },
          ],
          relevantPolicyRules: ['A 10-minute grace period applies to shift start times.'],
          citations: [
            {
              documentId: 'pol-001',
              documentTitle: 'Attendance Policy',
              section: '2.1',
              chunkId: 'chunk-001',
              snippet: '10 minute grace period applies.',
              relevanceExplanation: 'Directly governs late arrivals.',
            },
          ],
          applicabilityNotes: ['Applies to operations dept'],
          conflicts: [],
          insufficientEvidence: false,
        },
        recommendation: {
          recommendationType: 'EXCUSE_LATE_ARRIVAL',
          proposedAction: 'Acknowledge verbal reminder under Category 1 tardiness.',
          proposedChanges: [
            {
              field: 'clock_in_utc',
              currentValue: '2026-03-01T09:15:00Z',
              proposedValue: '2026-03-01T09:15:00Z',
              rationale: 'Recorded actual arrival time verified per policy Category 1.',
            },
          ],
          rationale: 'First infraction within 30-day window per Attendance Policy Section 2.1.',
          supportingFacts: ['Clock in 09:15 UTC'],
          policyCitations: [
            {
              documentId: 'pol-001',
              documentTitle: 'Attendance Policy',
              section: '2.1',
              chunkId: 'chunk-001',
              snippet: '10 minute grace period applies.',
              relevanceExplanation: 'Directly governs late arrivals.',
            },
          ],
          uncertaintyExplanation: 'None',
          confidenceScore: 0.85,
          requiredApproverRole: 'MANAGER' as const,
          requiresEmployeeConfirmation: false,
          riskLevel: 'LOW' as const,
          questionsOrMissingEvidence: [],
        },
        reviewerVerdict: 'PASS' as const,
        reviewerIssues: [],
      };

      const result = FullInvestigationResponseSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid payload violating schema bounds', () => {
      const invalidPayload = {
        summary: 'Too short', // violates min(10)
        confirmedFacts: [],
        missingInformation: [],
        confidenceScore: 1.5, // violates max(1.0)
      };

      const result = InvestigationResultSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('2. Mutation Guardrails & Field Whitelisting', () => {
    it('allows permitted timecard mutation fields with rationale', () => {
      const changes = [
        {
          field: 'clock_out_utc',
          proposedValue: '2026-03-01T17:00:00Z',
          rationale: 'Adjusted to scheduled shift end per Section 4.2',
        },
      ];
      const check = validateProposedChangesGuardrail(changes);
      expect(check.passed).toBe(true);
      expect(check.violations.length).toBe(0);
    });

    it('strictly blocks AI from modifying prohibited financial fields (e.g. salary, hourly_rate)', () => {
      const illegalChanges = [
        {
          field: 'salary',
          proposedValue: 95000,
          rationale: 'AI attempting compensation modification',
        },
        {
          field: 'hourly_rate',
          proposedValue: 45.0,
          rationale: 'Unauthorized wage change',
        },
      ];
      const check = validateProposedChangesGuardrail(illegalChanges);
      expect(check.passed).toBe(false);
      expect(check.violations.some((v) => v.includes('prohibited sensitive field'))).toBe(true);
    });

    it('blocks modification without a documented rationale', () => {
      const noRationaleChange = [
        {
          field: 'clock_out_utc',
          proposedValue: '2026-03-01T17:00:00Z',
          rationale: '',
        },
      ];
      const check = validateProposedChangesGuardrail(noRationaleChange);
      expect(check.passed).toBe(false);
      expect(check.violations.some((v) => v.includes('MISSING_RATIONALE'))).toBe(true);
    });
  });

  describe('3. Citation Grounding & Hallucination Prevention', () => {
    it('passes when citations exist in retrieved policy chunks', () => {
      const citations = [{ chunkId: 'chunk-001', documentTitle: 'Attendance Policy' }];
      const availableChunks = ['chunk-001', 'chunk-002', 'chunk-003'];

      const check = validateCitationGroundingGuardrail(citations, availableChunks);
      expect(check.passed).toBe(true);
      expect(check.violations.length).toBe(0);
    });

    it('flags hallucinated citations that do not exist in retrieved sources', () => {
      const citations = [{ chunkId: 'hallucinated-chunk-999', documentTitle: 'Fake Policy' }];
      const availableChunks = ['chunk-001', 'chunk-002'];

      const check = validateCitationGroundingGuardrail(citations, availableChunks);
      expect(check.passed).toBe(false);
      expect(check.violations.some((v) => v.includes('HALLUCINATED_CITATION'))).toBe(true);
    });
  });

  describe('4. Human-in-the-Loop Governance & Mandatory Justification', () => {
    it('allows APPROVE decisions without mandatory comment', () => {
      const check = validateHumanDecisionGuardrail('APPROVE');
      expect(check.passed).toBe(true);
    });

    it('rejects REJECT decisions that lack an explanatory justification', () => {
      const check = validateHumanDecisionGuardrail('REJECT', '');
      expect(check.passed).toBe(false);
      expect(check.violations.some((v) => v.includes('MANDATORY_JUSTIFICATION'))).toBe(true);
    });

    it('approves REJECT decisions with a clear, auditable comment', () => {
      const check = validateHumanDecisionGuardrail(
        'REJECT',
        'Employee confirmed they did not work overtime; shift ended at 17:00.'
      );
      expect(check.passed).toBe(true);
      expect(check.violations.length).toBe(0);
    });
  });

  describe('5. Fallback Design & Resilience', () => {
    it('gracefully completes investigation via local synthesis when external AI service is unavailable', async () => {
      const sampleExc = queryOne<any>('SELECT id, tenant_id FROM exception_cases LIMIT 1');
      expect(sampleExc).toBeTruthy();

      const result = await runInvestigationPipeline({
        exceptionId: sampleExc.id,
        tenantId: sampleExc.tenant_id,
      });

      expect(result).toHaveProperty('approvalId');
      expect(result).toHaveProperty('investigationId');
      expect(result).toHaveProperty('recommendationId');
      expect(result.verdict).toBe('PASS');

      // Check that an approval record was successfully persisted in SQLite
      const approval = queryOne<any>('SELECT * FROM approvals WHERE id = ?', [result.approvalId]);
      expect(approval).toBeTruthy();
      expect(approval.status).toBe('PENDING');
      expect(approval.expires_at).toBeTruthy();
    });
  });
});
