# ADR-001: Inngest for Durable Business Workflow Orchestration

## Status
Accepted

## Date
2026-11-18

## Context
Time & Attendance exception resolution inherently spans unpredictable durations—from seconds (immediate auto-detection) to hours or days (waiting for employee punch confirmation or manager review). Furthermore, multi-step workflows interact with AI APIs that can encounter transient rate limits (HTTP 429) or temporary network outages.

Without durable orchestration, systems either:
1. Hold persistent HTTP connections or Node.js timers (`setTimeout`), which crash or drop state during container restarts or deployments.
2. Require ad-hoc state-machine tables in SQL with polling cron workers, which are error-prone, hard to observe, and lack step-level replayability.

## Decision
Adopt **Inngest** as the primary durable workflow orchestration engine:
1. Inngest manages the outer lifecycle of all exceptions: step sequencing, step retries, backoff, and event-driven waiting (`step.waitForEvent`).
2. Long-running human approvals hibernate execution without consuming compute resources.
3. Steps are executed with at-least-once durability; side effects are guarded by stable idempotency keys.

## Alternatives Considered
- **Temporal / Cadence:** Powerful but requires substantial operational overhead (Cassandra/Postgres dependencies, dedicated cluster binaries) exceeding the 48-hour challenge constraints.
- **BullMQ / Redis:** Provides basic queuing and retries, but lacks native durable execution primitives (e.g. `step.waitForEvent` correlating external event signals across arbitrary time horizons).
- **LangGraph Checkpointing:** Good for internal cyclic AI agent loops, but unsuited for outer business workflows requiring reliable multi-day human-in-the-loop approvals, domain transactions, and independent service boundaries.

## Consequences
- **Positive:** Zero server resources consumed while waiting for manager approvals; step-level retries prevent re-running already completed LLM steps; clear observability via Inngest Dev Server traces.
- **Negative / Trade-off:** Step outputs must be JSON-serializable; side-effect functions must be strictly idempotent to tolerate retries.
