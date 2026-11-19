# AttendWise AI

> **Agentic Time & Attendance Exception Management & Autonomous Resolution Platform**  
> *DayForce AI Innovation Challenge — Technical Submission*

---

## 🌟 Executive Summary

**AttendWise AI** is an enterprise-grade agentic workforce management platform designed to solve the chronic operational overhead of Time & Attendance (T&A) exceptions. Traditional T&A systems flag attendance anomalies—such as missing clock-outs, late arrivals, unauthorized overtime, and shift conflicts—but leave investigation, policy reconciliation, and timecard corrections to manual and inconsistent human intervention.

AttendWise AI provides:
1. **Deterministic Anomaly Detection**: Strict rule-based scanning over shift schedules, badge events, and grace-period thresholds.
2. **Multi-Agent AI Investigation**: A LangGraph reasoning state machine that correlates historical punches, retrieves relevant company policy clauses via RAG, and verifies factual grounding.
3. **Evidence-Backed Recommendations**: Synthesizes structured adjustment proposals with exact policy citations, confidence scores, and risk classifications.
4. **Human-in-the-Loop (HITL) Governance**: Consequential payroll and timecard modifications require explicit manager or HR approval before application.
5. **Transactional & Audited Execution**: Atomic database updates with optimistic concurrency locks and an immutable, tamper-evident audit log.

---

## 🛠️ Challenge Technical Stack Compliance

The project adheres strictly to the approved challenge stack specifications:

| Requirement Category | Selected Technology | Implementation Details |
|---|---|---|
| **Frontend** | **React 19 / Next.js 15 / TypeScript** | Responsive TailwindCSS UI, real-time toasts, instant role switcher, before/after diffs |
| **Backend** | **Node.js 22 / TypeScript / Express** | ACID domain API, optimistic concurrency, transactional execution |
| **AI Backend** | **Python 3.12 / FastAPI** | High-performance async microservice with typed Pydantic v2 schemas |
| **AI Orchestration** | **LangChain + LangGraph** | StateGraph with nodes for investigation, policy retrieval, resolution planning, and reviewer verification |
| **Workflow Orchestration** | **Inngest + Sync Pipeline** | Durable workflow steps (`waitForEvent`) with local fallback pipeline runner |
| **Knowledge Retrieval** | **Qdrant + SQLite Chunks** | Dense vector search with fallback semantic chunk retrieval over uploaded policies |
| **Data Storage** | **SQLite via `better-sqlite3`** | Authoritative ACID relational data source with raw SQL migrations (zero Prisma) |
| **API Contract** | **OpenAPI 3.0.3 Specification** | Formally defined in `docs/openapi.yaml` and live FastAPI `/docs` |
| **Validation** | **Zod + Pydantic v2** | Full runtime schema enforcement across TypeScript and Python boundaries |
| **Testing** | **Vitest + Python Validation** | 21 / 21 passing automated unit and integration tests |
| **CI & Delivery** | **GitHub Actions CI** | Automated linting, testing, and production builds in `.github/workflows/ci.yml` |

---

## 📐 System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               Next.js 15 SaaS Dashboard                │
                    │               (http://localhost:3000)                  │
                    └────────────┬──────────────────────────────▲────────────┘
                                 │ JWT Auth                      │ Live Polling / SSE
                                 ▼                               │
                    ┌────────────────────────────┐               │
                    │      Core API (Express)    │───────────────┘
                    │   (http://localhost:3001)  │
                    └────────────┬───────────────┘
                                 │
         ┌───────────────────────┼────────────────────────┐
         ▼                       ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  SQLite Database │    │  AI Service      │    │  Inngest Worker  │
│  (dev.db ACID)   │    │  (FastAPI :8000) │    │  (Durable Steps) │
│  - shifts        │    │  - LangGraph     │    │  - waitForEvent  │
│  - attendance    │    │  - Qdrant Vector │    │  - auto-retries  │
│  - exceptions    │    │  - Policy RAG    │    │  - escalation    │
│  - approvals     │    └──────────────────┘    └──────────────────┘
│  - audit_logs    │
└──────────────────┘
```

### The 7-Stage Agent Pipeline
1. **Detection**: Deterministic evaluation of badge punches against scheduled shifts (grace periods, 8-hour overtime thresholds, missing punch windows).
2. **Context Gathering**: Joins shift times, employee details, and manager reporting lines.
3. **Policy Retrieval (RAG)**: Retrieves semantic chunks from indexed company documents (Late Arrival, Overtime, Missing Punch, Rest Periods).
4. **AI Investigation**: LangGraph nodes verify evidence, identify missing information, and compute a confidence score.
5. **Resolution Planning**: Formulates concrete attendance adjustments with risk rating and citations.
6. **Human-in-the-Loop Approval**: Pending approvals appear in the Manager / HR Approval Inbox with before/after diffs.
7. **Transactional Execution**: Atomic updates with optimistic locking (`version = version + 1`) and immutable audit trails.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js ≥ 20.x** (Node 22 recommended)
- **Python 3.12**
- **npm** (built-in with Node)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/attendwise-ai.git
cd attendwise-ai
npm install
```

### 2. Set Up Python AI Service Virtual Environment
```bash
cd apps/ai-service
python -m venv .venv

# Windows:
.venv\Scripts\pip install -r requirements.txt

# Linux / macOS:
source .venv/bin/activate && pip install -r requirements.txt

cd ../..
```

### 3. Initialize SQLite Schema & Seed Demo Data
```bash
npm run seed
```
*Seeds 1 tenant, 11 users, 9 employees, 2 weeks of shifts/punches, 5 policies, and pre-generates active pending approvals.*

### 4. Start Local Services

**Terminal 1 — Core API Server**
```bash
cd apps/core-api
npm run dev
# Running on http://localhost:3001
```

**Terminal 2 — Python AI & RAG Service**
```bash
cd apps/ai-service
# Windows:
.venv\Scripts\uvicorn app.main:app --app-dir . --port 8000 --reload
# Linux / macOS:
source .venv/bin/activate && uvicorn app.main:app --port 8000 --reload
# Running on http://localhost:8000 (Swagger docs at /docs)
```

**Terminal 3 — Next.js 15 Web Application**
```bash
cd apps/web
npm run dev
# Running on http://localhost:3000
```

---

## 🔑 Demo Personas & Credentials

All seeded demo accounts use the standard password: **`demo1234`**

| Persona | Role | Email | Capabilities & Scope |
|---|---|---|---|
| **Sarah Chen** | `HR_ADMIN` | `hr.admin@acme.com` | Org-wide exception management, policy uploads, executive audit trail |
| **David Miller** | `MANAGER` | `mgr.ops@acme.com` | Operations manager (Alice, Bob, Dan); reviews and approves timecards |
| **Lisa Park** | `MANAGER` | `mgr.tech@acme.com` | Technology manager (Eva, Frank, Grace); manages engineering attendance |
| **Alice Johnson** | `EMPLOYEE` | `alice.johnson@acme.com` | View personal shift schedule, verify punches, see active exceptions |
| **System Admin** | `SYSTEM_ADMIN` | `sysadmin@acme.com` | System health diagnostics, raw event streams, configuration |

> 💡 **Instant Role Switcher**: Use the 1-click persona buttons on the **[Login Page](http://localhost:3000/login)** or the **Persona Dropdown** in the top navigation bar to switch roles instantaneously without retyping credentials.

---

## 🗺️ Key Application Screens & Workflows

| Screen / Feature | Route | Description |
|---|---|---|
| **Executive Dashboard** | `/dashboard` | Real-time KPI summary (exceptions, approvals, compliance rate), anomaly distribution charts, 1-click Attendance Scan. |
| **Approval Inbox** | `/approvals` | Live human-in-the-loop decision queue for managers. Displays employee details, proposed action, before/after diffs, and decision actions (**Approve**, **Reject**, **Request More Info**). |
| **Exception Center** | `/exceptions` | Full filterable list of attendance anomalies with severity badges and investigation statuses. |
| **Exception Detail View** | `/exceptions/[id]` | 4-step lifecycle stepper, confirmed facts, RAG policy citations, AI confidence score, and on-demand investigation trigger. |
| **AI Agents & Architecture** | `/agents` | Interactive multi-agent architecture visualizer mapping all 7 pipeline stages, live simulation console, and end-to-end user input checklist. |
| **Policy Document Hub** | `/policies` | View active company policies and upload new documents via modal with automated semantic chunking and 1-click corporate templates. |
| **Attendance Explorer** | `/attendance` | Historical log of badge swipes and punches across all staff with anomaly highlights. |
| **Staff Directory** | `/employees` | Complete employee roster with department, job titles, and manager reporting structure. |
| **Audit Trail** | `/audit` | Immutable, chronological ledger tracking every scan, investigation, approval decision, and payroll adjustment. |

---

## 🧪 Testing & Verification Suite

Run the full automated test suite:
```bash
npm --workspace=@attendwise/core-api run test
```

### Verified Test Matrix (21 / 21 Passing):
- **`datetime.test.ts` (13 tests)**:
  - Grace period boundary calculations.
  - Worked duration and break deductions.
  - Overnight shifts spanning calendar boundaries.
  - Shift conflict and overlap detection.
- **`db.test.ts` (5 tests)**:
  - SQLite foreign key integrity and employee reporting hierarchy.
  - Idempotent deduplication keys (`dedupe_key`).
  - Optimistic concurrency locking (`version` increment check).
  - Atomic transaction rollback on failure.
- **`detector.test.ts` (3 tests)**:
  - Deterministic anomaly detection across 14-day historical shifts.
  - Database persistence of detected exception cases.
  - Idempotent subsequent scans without record duplication.

---

## 📜 Documentation Directory

- **[docs/openapi.yaml](docs/openapi.yaml)**: Complete OpenAPI 3.0.3 specification covering all REST endpoints.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Deep dive into architectural layers, sequence diagrams, and security model.
- **[docs/EVENT_CATALOG.md](docs/EVENT_CATALOG.md)**: Inngest event definitions and durable payload contracts.
- **[docs/API_SPEC.md](docs/API_SPEC.md)**: REST API reference for frontend and third-party integrations.
- **[docs/adr/](docs/adr/)**: Formal Architecture Decision Records (ADR-001 through ADR-005).
- **[PROJECT_CONTEXT.txt](PROJECT_CONTEXT.txt)**: Continuous project execution and milestone tracking log.
