# AttendWise AI — Master Implementation Plan & Progress Checklist

This document tracks execution progress against the architectural specification.

---

## Milestone 0: Reconnaissance & Architectural Groundwork
- [x] Inspect workspace and runtime environments (Node.js 22.17.0, Python 3.12.7, npm 10.9.2).
- [x] Establish `PROJECT_CONTEXT.txt` as living project memory.
- [x] Create `docs/ARCHITECTURE.md` with system design and sequence diagrams.
- [x] Create Architecture Decision Records (`docs/adr/ADR-001` through `ADR-005`).
- [x] Define `docs/EVENT_CATALOG.md` and `docs/API_SPEC.md`.

## Milestone 1: Monorepo Skeleton & Local Infrastructure
- [ ] Initialize root `package.json` with npm workspaces (`apps/*`, `packages/*`).
- [ ] Scaffold `apps/core-api` (Express + TypeScript + Prisma).
- [ ] Scaffold `apps/workflow-worker` (Inngest TypeScript SDK).
- [ ] Scaffold `apps/ai-service` (FastAPI + Pydantic v2 + Qdrant client).
- [ ] Scaffold `apps/web` (Next.js 15 / React 19 + TailwindCSS).
- [ ] Scaffold `packages/contracts` (Shared Zod schemas and TypeScript interfaces).
- [ ] Create `docker-compose.yml` for PostgreSQL and Qdrant.
- [ ] Create `.env.example` with documented environment configurations.

## Milestone 2: Domain Model, Migrations & Demo Seed Data
- [ ] Define comprehensive Prisma schema with strict relational integrity, foreign keys, and indexes.
- [ ] Implement seed script with realistic demo company (1 Tenant, 1 HR Admin, 2 Managers, 10 Employees, 2 Weeks of Shifts/Punches, Synthetic Policies).
- [ ] Implement deterministic date/time & timezone utilities (UTC persistence with IANA display).
- [ ] Add unit tests for boundary conditions (overnight shifts, exactly-at-grace limit).

## Milestone 3: Deterministic Exception Detection Engine
- [ ] Implement rule detectors:
  - Missing Clock-Out (post-shift + grace period).
  - Missing Clock-In (scheduled shift without punch).
  - Late Arrival (clock-in > scheduled start + grace period).
  - Overtime Review (worked hours > daily threshold).
- [ ] Implement idempotent exception creation (`dedupeKey` uniqueness).
- [ ] Implement scan API endpoint (`POST /api/v1/attendance/scan`).
- [ ] Add unit tests verifying zero duplicates on repeated scans.

## Milestone 4: Policy RAG Ingestion & Vector Retrieval Service
- [ ] Implement text chunking with metadata extraction (title, category, page, section, effective dates).
- [ ] Integrate Qdrant vector client (with embedded/memory fallback for local dev).
- [ ] Implement retrieval engine with metadata payload filters (`category`, `tenant_id`, `jurisdiction`).
- [ ] Ingest synthetic policies (Timekeeping, Missing Punch, Grace Period, Overtime Rules).
- [ ] Write tests ensuring citations map to verified source chunk IDs.

## Milestone 5: AI Investigation & Resolution Planning Agents
- [ ] Implement Investigation Agent (fact compilation, missing information detection).
- [ ] Implement Resolution Planner Agent (Pydantic schema, grounded recommendations).
- [ ] Implement Policy/Quality Reviewer (anti-hallucination check, citation validation).
- [ ] Implement fallback adapters (live LLM / resilient deterministic mock adapter).

## Milestone 6: Inngest Durable Orchestration Workflows
- [ ] Configure Inngest client and event dispatching.
- [ ] Implement primary durable workflow: `investigate-exception`.
- [ ] Add step-level retries and transient error classification.
- [ ] Add global failure handlers and non-retriable error routing.

## Milestone 7: Human-in-the-Loop Approval & Safe Transactional Execution
- [ ] Implement `step.waitForEvent` for `attendance/approval.decision-submitted`.
- [ ] Implement approval decision API (`POST /api/v1/approvals/:id/decision`) with RBAC and manager scoping.
- [ ] Implement atomic correction executor with transaction, version check, and idempotency key.
- [ ] Implement append-only immutable audit logging.
- [ ] Add integration tests for approve/reject paths and replay protection.

## Milestone 8: Modern SaaS Frontend Integration
- [ ] Build Dashboard KPI cards and activity feed.
- [ ] Build Attendance Records Explorer with shift visualization.
- [ ] Build Exception Center with status/severity filters.
- [ ] Build Case Detail with AI investigation breakdown and interactive policy citations.
- [ ] Build Manager Approval Inbox with side-by-side diffs.
- [ ] Build Audit Trail viewer and Role Switcher.

## Milestone 9: Polish, QA, End-to-End Verification & Demo Script
- [ ] Run full end-to-end demo flow for Case A (Missing Clock-Out) and Case B (Late Arrival).
- [ ] Verify transient failure recovery and idempotency.
- [ ] Write `docs/DEMO_SCRIPT.md` and complete `README.md`.
- [ ] Finalize `PROJECT_CONTEXT.txt`.
