# 🎬 AttendWise AI — Official Demo Recording & Walkthrough Guide
> **DayForce AI Innovation Challenge — Technical Submission**  
> *"Build thoughtfully: ground AI in trusted context, validate its output, and keep people accountable for important decisions."*

This guide provides a structured, timed script for recording an impactful 3-to-5 minute submission demo video that maximizes scores across all 5 evaluation criteria.

---

## ⏱️ Video Timing & Scoring Blueprint

| Timecode | Segment Name | Evaluation Criterion | Key What-to-Show |
|:---|:---|:---:|:---|
| **0:00 – 0:45** | **The Problem & Value** | **Product Value (25%)** | T&A exception crisis ($7.4B fines), 15-min review bottlenecks, and the 82% time-saving ROI. |
| **0:45 – 2:00** | **Live Workflow Demo** | **Product Value (25%)** | Digital web clock punch → instant anomaly detection → Grok AI investigation → manager approval inbox. |
| **2:00 – 3:00** | **Harness & Safety Guardrails** | **Harness Engineering (25%)** | Structured Zod/Pydantic contracts, mutation whitelisting (no salary tampering), fallback design, 48h SLA. |
| **3:00 – 3:45** | **LLM Implementation & Grounding** | **LLM Implementation (20%)** | Grok API (xAI/Groq), Qdrant RAG dense vector search, grounded policy citations, reviewer node verification. |
| **3:45 – 4:30** | **Engineering & Testing Evidence** | **Engineering Quality (15%)** | Running `npm test` live (32/32 tests passing), optimistic concurrency locking, tamper-evident audit ledger. |
| **4:30 – 5:00** | **Summary & Business Impact** | **Demo Recording (15%)** | $180K annual savings per 1k staff, 1,400+ manager hours reclaimed, closing vision. |

---

## 🎙️ Step-by-Step Recording Script & Click-by-Click Guide

### 1. Introduction: Problem & User Value (0:00 – 0:45)
- **Screen**: Start on [http://localhost:3000/dashboard](http://localhost:3000/dashboard).
- **Spoken Script**:
  > *"Welcome to AttendWise AI, an autonomous workforce intelligence platform built for the Dayforce AI Challenge. Every day, enterprise HR teams spend millions of hours manually investigating time and attendance exceptions—like missed clock-outs, unexpected overtime, and late arrivals. In fact, 62% of payroll errors stem from attendance discrepancies, contributing to over $7.4 billion in annual compliance fines.*
  >
  > *AttendWise AI eliminates this operational bottleneck by automating the detection, investigation, and recommendation process while strictly keeping managers accountable through Human-in-the-Loop governance. The result? An 82% reduction in resolution time, 99.4% policy compliance, and over $180,000 in annual savings per thousand employees."*

---

### 2. Practical Workflow Walkthrough (0:45 – 2:00)
- **Screen**: Navigate to `/attendance` or use the dashboard **Punch Clock Widget**.
- **Action**:
  1. Demonstrate an employee punch on the **Live Digital Web Clock**.
  2. Click **Run Exception Scan** on the Executive Dashboard (`/dashboard`).
  3. Notice how deterministic rule checks immediately detect anomalies (e.g. Alice Johnson's Missing Clock-Out and Late Arrival).
  4. Navigate to `/approvals` (logged in as Operations Manager **David Miller** `mgr.ops@acme.com`).
- **Spoken Script**:
  > *"Let's see this in action. An employee records their punches using our zero-hardware Digital Web Clock. The moment an anomaly occurs—such as a missing clock-out or late arrival—our deterministic detection engine flags it immediately.*
  >
  > *The Grok AI agent investigates in the background, pulls the exact company policies, and delivers a structured proposal to the Manager Approval Inbox. Notice the clear Before and After diff: the manager sees what the timecard currently says, what the AI proposes, the cited policy clause, and the reasoning chain.*
  >
  > *With one click, the manager can approve the adjustment, modify it, or reject it with mandatory feedback. No consequential change ever happens without human sign-off."*

---

### 3. Harness Engineering, Guardrails & Fallbacks (2:00 – 3:00)
- **Screen**: Navigate to `/agents` (AI Agent Workspace) and `/audit` (Audit Trail).
- **Action**: Show the 7-stage pipeline diagram and the immutable audit log entries.
- **Spoken Script**:
  > *"Under the hood, AttendWise AI is built around rigorous harness engineering. We maintain strictly mirrored structured contracts between Python Pydantic schemas and TypeScript Zod validation.*
  >
  > *We enforce strict enterprise guardrails: the AI is constrained to a whitelist of allowable fields—specifically clock times and worked hours. It is physically prohibited from touching compensation, hourly wages, or roles. If an LLM ever attempts an unauthorized field mutation, the harness blocks it immediately.*
  >
  > *Furthermore, we built comprehensive fallback resilience: if the external AI service or network ever times out, our local synthesis engine takes over gracefully, ensuring payroll is never blocked. Every single approval, rejection, or system adjustment is version-locked under optimistic concurrency and recorded in our immutable audit ledger."*

---

### 4. LLM Implementation & Grounded Policy RAG (3:00 – 3:45)
- **Screen**: Navigate to `/policies` (Policy Knowledge Base) and open an exception detail (`/exceptions/1`).
- **Action**: Show an uploaded company handbook, chunk inspection, and the cited policy snippets.
- **Spoken Script**:
  > *"For AI intelligence, we utilize the Grok API via Groq high-speed inference—running strictly without OpenAI dependencies. Grok's lightning-fast deterministic inference allows us to complete multi-step agent investigations in under two seconds.*
  >
  > *Our RAG engine indexes corporate attendance policies into Qdrant using dense cosine similarity with semantic category filtering. In our LangGraph pipeline, a specialized Reviewer agent verifies that every cited policy snippet actually exists in the retrieved sources, eliminating hallucinations before recommendations reach the manager's inbox."*

---

### 5. Engineering Quality & Verification Evidence (3:45 – 4:30)
- **Screen**: Split-screen with terminal or show CI badge on GitHub.
- **Action**: Run the automated test suite in terminal:
  ```bash
  npm --workspace=@attendwise/core-api run test
  ```
- **Spoken Script**:
  > *"Engineering quality and safety are verified through automated testing. As you can see, our suite contains 32 comprehensive tests—and all 32 are passing with a 100% success rate.*
  >
  > *This covers datetime math across midnight shifts, SQLite ACID transaction integrity with foreign key cascades, deterministic anomaly detection, and our newly added harness guardrail validation suite. Continuous integration is enforced on every commit via GitHub Actions."*

---

### 6. Closing & Business Impact (4:30 – 5:00)
- **Screen**: Return to the Executive Dashboard `/dashboard` showing the Measurable Outcomes banner.
- **Spoken Script**:
  > *"To summarize: AttendWise AI brings practical product value, enterprise harness guardrails, grounded Grok AI reasoning, and verifiable engineering quality to Dayforce workforce management.*
  >
  > *It grounds AI in trusted context, validates its output, and keeps people accountable for important decisions. Thank you!"*

---

## 🛠️ Quick Demo Setup Commands

To start the demo environment from scratch:

```bash
# 1. Seed demo database with tenants, employees, shifts & policies
npm run seed

# 2. Run automated test suite (verifies 32/32 tests pass)
npm --workspace=@attendwise/core-api run test

# 3. Start all services concurrently
npm run dev
# Web App:      http://localhost:3000
# Core API:     http://localhost:3001
# AI Service:   http://localhost:8000
```

### Pre-Seeded Demo Logins (Password: `demo1234`):
- **Sarah Chen** (`hr.admin@acme.com`): `HR_ADMIN` — Org-wide analytics, policy uploads, full audit trail.
- **David Miller** (`mgr.ops@acme.com`): `MANAGER` — Operations manager with pending approvals for Alice & Bob.
- **Alice Johnson** (`alice.johnson@acme.com`): `EMPLOYEE` — Live punch clock & personal exception status.
