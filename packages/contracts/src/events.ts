import { z } from 'zod';

export const AttendanceScanRequestedEventSchema = z.object({
  tenantId: z.string(),
  correlationId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  departmentId: z.string().nullable().optional(),
  timestamp: z.string(),
});

export const AttendanceExceptionDetectedEventSchema = z.object({
  tenantId: z.string(),
  correlationId: z.string(),
  exceptionId: z.string(),
  dedupeKey: z.string(),
  employeeId: z.string(),
  shiftId: z.string(),
  attendanceRecordId: z.string().nullable().optional(),
  exceptionType: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  facts: z.record(z.any()),
  timestamp: z.string(),
});

export const AttendanceApprovalRequestedEventSchema = z.object({
  tenantId: z.string(),
  correlationId: z.string(),
  approvalId: z.string(),
  exceptionId: z.string(),
  recommendationId: z.string(),
  requiredRole: z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN']),
  assignedApproverId: z.string().nullable().optional(),
  proposedAction: z.string(),
  expiresAt: z.string(),
  timestamp: z.string(),
});

export const AttendanceApprovalDecisionSubmittedEventSchema = z.object({
  tenantId: z.string(),
  correlationId: z.string(),
  approvalId: z.string(),
  exceptionId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_MORE_INFO']),
  decisionComment: z.string().optional(),
  decidedByUserId: z.string(),
  decidedAt: z.string(),
});

export const AttendanceCorrectionAppliedEventSchema = z.object({
  tenantId: z.string(),
  correlationId: z.string(),
  exceptionId: z.string(),
  attendanceRecordId: z.string(),
  approvalId: z.string(),
  idempotencyKey: z.string(),
  previousClockOutUtc: z.string().nullable().optional(),
  newClockOutUtc: z.string().nullable().optional(),
  appliedByUserId: z.string(),
  timestamp: z.string(),
});

export const AttendanceExceptionResolvedEventSchema = z.object({
  tenantId: z.string(),
  correlationId: z.string(),
  exceptionId: z.string(),
  resolutionOutcome: z.string(),
  resolvedAt: z.string(),
});

export type AttendanceScanRequestedEvent = z.infer<typeof AttendanceScanRequestedEventSchema>;
export type AttendanceExceptionDetectedEvent = z.infer<typeof AttendanceExceptionDetectedEventSchema>;
export type AttendanceApprovalRequestedEvent = z.infer<typeof AttendanceApprovalRequestedEventSchema>;
export type AttendanceApprovalDecisionSubmittedEvent = z.infer<typeof AttendanceApprovalDecisionSubmittedEventSchema>;
export type AttendanceCorrectionAppliedEvent = z.infer<typeof AttendanceCorrectionAppliedEventSchema>;
export type AttendanceExceptionResolvedEvent = z.infer<typeof AttendanceExceptionResolvedEventSchema>;
