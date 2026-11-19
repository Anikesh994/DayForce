export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';

export type ExceptionType =
  | 'MISSING_CLOCK_OUT'
  | 'MISSING_CLOCK_IN'
  | 'LATE_ARRIVAL'
  | 'EARLY_DEPARTURE'
  | 'OVERTIME_REVIEW'
  | 'SHIFT_CONFLICT'
  | 'LEAVE_ATTENDANCE_MISMATCH';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type ExceptionStatus =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'WAITING_FOR_EMPLOYEE'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_MORE_INFO'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'FAILED'
  | 'CANCELLED';

export type ApprovalDecision = 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';

export type RecommendationType =
  | 'ADJUST_CLOCK_OUT'
  | 'ADJUST_CLOCK_IN'
  | 'APPROVE_OVERTIME'
  | 'REJECT_OVERTIME'
  | 'EXCUSE_LATE_ARRIVAL'
  | 'REQUEST_EMPLOYEE_CONFIRMATION'
  | 'ESCALATE_TO_HR'
  | 'NO_ACTION_REQUIRED';

export interface PolicyCitation {
  documentId: string;
  documentTitle: string;
  section: string;
  page?: number;
  chunkId: string;
  snippet: string;
  relevanceExplanation: string;
}

export interface ProposedChange {
  field: string;
  currentValue: any;
  proposedValue: any;
  rationale: string;
}

export interface RecommendationPayload {
  recommendationType: RecommendationType;
  proposedAction: string;
  proposedChanges: ProposedChange[];
  rationale: string;
  supportingFacts: string[];
  policyCitations: PolicyCitation[];
  uncertaintyExplanation?: string;
  confidenceScore: number;
  requiredApproverRole: UserRole;
  requiresEmployeeConfirmation: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  questionsOrMissingEvidence: string[];
}
