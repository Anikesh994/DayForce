# ADR-004: AI Service is Read-Only & Untrusted

## Status
Accepted

## Date
2026-11-18

## Context
Generative AI models and LLM agents are non-deterministic and susceptible to prompt injection, hallucinations, and ungrounded extrapolation. In a Time & Attendance domain, unconstrained AI mutations could inadvertently modify payroll hours, grant unearned overtime, or misclassify absences.

## Decision
Design the AI Service with strict read-only and unprivileged constraints:
1. The AI Service is provided only sanitized case facts (anonymized/structured IDs, timestamps, shift schedules) via internal authenticated HTTP endpoints.
2. The AI Service possesses **zero** database write credentials to PostgreSQL. It cannot issue SQL queries, execute shell commands, or trigger external write webhooks.
3. All AI responses must conform to strict Pydantic schemas (typed recommendations, citations, uncertainty scores).
4. An automated AI Quality Reviewer validates that any cited policy text is genuinely present in the retrieved chunks before emitting a recommendation.

## Alternatives Considered
- **Autonomous Agent with Database Tools:** Allowing an LLM agent to inspect the database and directly update rows via tool calls. Rejected due to extreme security, auditability, and safety risks.

## Consequences
- **Positive:** Zero risk of prompt injection compromising database state; guaranteed deterministic schema validation; full transparency for human reviewers.
- **Negative / Trade-off:** AI cannot perform autonomous multi-step writes; all side effects must flow through the Core API command layer.
