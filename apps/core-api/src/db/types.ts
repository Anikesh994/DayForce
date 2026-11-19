export interface Tenant {
  id: string;
  name: string;
  timezone: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  authProviderId?: string;
  email: string;
  displayName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  managerEmployeeId?: string;
  location: string;
  timezone: string;
  employmentStatus: 'ACTIVE' | 'TERMINATED' | 'ON_LEAVE';
  createdAt: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  employeeId: string;
  localDate: string; // YYYY-MM-DD
  timezone: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  breakMinutes: number;
  shiftType: 'REGULAR' | 'OVERNIGHT' | 'ON_CALL';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  version: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  shiftId?: string;
  clockInUtc: string | null;
  clockOutUtc: string | null;
  source: 'WEB_CLOCK' | 'MOBILE' | 'BADGE_SWIPE' | 'SYSTEM_ADJUSTMENT';
  status: 'RECORDED' | 'FLAGGED' | 'RESOLVED' | 'VERIFIED';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  startUtc: string;
  endUtc: string;
  leaveType: 'SICK' | 'VACATION' | 'PERSONAL' | 'BEREAVEMENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: string;
}

export interface ExceptionCase {
  id: string;
  tenantId: string;
  employeeId: string;
  shiftId?: string;
  attendanceRecordId?: string;
  exceptionType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'DETECTED' | 'INVESTIGATING' | 'WAITING_FOR_EMPLOYEE' | 'WAITING_FOR_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RESOLVED' | 'ESCALATED' | 'CANCELLED';
  dedupeKey: string;
  facts: Record<string, any>;
  version: number;
  detectedAt: string;
  resolvedAt?: string;
  assignedManagerId?: string;
}

export interface Investigation {
  id: string;
  exceptionId: string;
  workflowRunId?: string;
  summary: string;
  confirmedFacts: string[];
  missingInfo: string[];
  conflicts: string[];
  confidenceScore: number;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  exceptionId: string;
  investigationId?: string;
  recommendationType: string;
  proposedAction: string;
  proposedChanges: any[];
  rationale: string;
  supportingFacts: string[];
  policyCitations: any[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface Approval {
  id: string;
  tenantId: string;
  exceptionId: string;
  recommendationId: string;
  approvalIdempotencyKey: string;
  requiredRole: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';
  assignedApproverId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONSUMED';
  decision?: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';
  decisionComment?: string;
  requestedAt: string;
  expiresAt: string;
  decidedAt?: string;
  caseVersion: number;
  consumedAt?: string;
}

export interface PolicyDocument {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  location: string;
  storageKey: string;
  checksum: string;
  ingestionStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  uploadedBy?: string;
  createdAt: string;
}

export interface PolicyChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  page?: number;
  section: string;
  textSnippet: string;
  textHash: string;
  qdrantPointId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  tenantId: string;
  exceptionId?: string;
  workflowType: string;
  inngestRunId?: string;
  functionId: string;
  status: 'INITIALIZED' | 'RUNNING' | 'WAITING_FOR_APPROVAL' | 'COMPLETED' | 'FAILED';
  currentStage: string;
  lastErrorCode?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorType: 'USER' | 'SYSTEM' | 'WORKFLOW';
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  reason?: string;
  correlationId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  idempotencyKey: string;
  status: 'UNREAD' | 'READ';
  readAt?: string;
  createdAt: string;
}
