"""
Pydantic v2 schemas for all AI service request/response contracts.
These are the validation layer between the workflow worker and the AI agents.
"""
from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Shared ────────────────────────────────────────────────────────────────────

class PolicyCitation(BaseModel):
    document_id: str
    document_title: str
    section: str
    page: Optional[int] = None
    chunk_id: str
    snippet: str
    relevance_explanation: str


class ProposedChange(BaseModel):
    field: str
    current_value: Any
    proposed_value: Any
    rationale: str


# ── Investigation ─────────────────────────────────────────────────────────────

class InvestigationRequest(BaseModel):
    exception_id: str
    tenant_id: str
    exception_type: str
    severity: str
    facts: dict[str, Any]
    employee: dict[str, Any]
    shift: Optional[dict[str, Any]] = None
    attendance_record: Optional[dict[str, Any]] = None
    recent_history: list[dict[str, Any]] = Field(default_factory=list)
    leave_records: list[dict[str, Any]] = Field(default_factory=list)


class InvestigationResult(BaseModel):
    summary: str
    confirmed_facts: list[str]
    missing_information: list[str]
    conflicting_evidence: list[str]
    relevant_record_ids: list[str]
    suggested_follow_up_questions: list[str]
    confidence_score: float = Field(ge=0.0, le=1.0)
    uncertainty_explanation: str


# ── Policy RAG ────────────────────────────────────────────────────────────────

class PolicyRetrievalRequest(BaseModel):
    exception_type: str
    tenant_id: str
    facts: dict[str, Any]
    investigation_summary: str
    employee_location: Optional[str] = "ALL"
    employee_department: Optional[str] = None


class PolicyRetrievalResult(BaseModel):
    retrieved_sources: list[PolicyCitation]
    relevant_policy_rules: list[str]
    citations: list[PolicyCitation]
    applicability_notes: list[str]
    conflicts: list[str]
    insufficient_evidence: bool


# ── Resolution Planning ───────────────────────────────────────────────────────

class ResolutionRequest(BaseModel):
    exception_id: str
    tenant_id: str
    exception_type: str
    severity: str
    facts: dict[str, Any]
    investigation: InvestigationResult
    policy_evidence: PolicyRetrievalResult
    employee: dict[str, Any]
    attendance_record: Optional[dict[str, Any]] = None


class ResolutionResult(BaseModel):
    recommendation_type: str
    proposed_action: str
    proposed_changes: list[ProposedChange]
    rationale: str
    supporting_facts: list[str]
    policy_citations: list[PolicyCitation]
    uncertainty_explanation: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    required_approver_role: str
    requires_employee_confirmation: bool
    risk_level: str
    questions_or_missing_evidence: list[str]


# ── Full Pipeline ─────────────────────────────────────────────────────────────

class InvestigateRequest(BaseModel):
    exception_id: str
    tenant_id: str
    exception_type: str
    severity: str
    facts: dict[str, Any]
    employee: dict[str, Any]
    shift: Optional[dict[str, Any]] = None
    attendance_record: Optional[dict[str, Any]] = None
    recent_history: list[dict[str, Any]] = Field(default_factory=list)
    leave_records: list[dict[str, Any]] = Field(default_factory=list)
    policy_chunks: list[dict[str, Any]] = Field(default_factory=list)


class FullInvestigationResponse(BaseModel):
    exception_id: str
    investigation: InvestigationResult
    policy_evidence: PolicyRetrievalResult
    recommendation: ResolutionResult
    reviewer_verdict: str   # PASS | NEEDS_REVISION | ESCALATE
    reviewer_issues: list[str]
