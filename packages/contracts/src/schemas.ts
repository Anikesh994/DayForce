import { z } from 'zod';

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

export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionInputSchema>;
export type AttendanceScanInput = z.infer<typeof AttendanceScanInputSchema>;
export type ExceptionQuery = z.infer<typeof ExceptionQuerySchema>;
