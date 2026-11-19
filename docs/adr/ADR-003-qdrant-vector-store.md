# ADR-003: Qdrant as Policy Vector Store

## Status
Accepted

## Date
2026-11-18

## Context
When investigating exceptions, the system must ground recommendations in actual company policies (e.g. Grace Period Rules, Overtime Authorization, Missing Punch Procedures). Policy handbooks contain distinct clauses applicable by employee location, jurisdiction, department, and policy version/effective date.

Vector search must support metadata payload filtering (e.g. filtering by `tenant_id`, `category`, and `effective_date`) and must run smoothly in local development without mandatory heavy infrastructure.

## Decision
Use **Qdrant** as the policy vector store:
1. Qdrant supports advanced boolean and range payload filtering on rich JSON metadata during nearest-neighbor search.
2. In production / docker, Qdrant runs as a fast, lightweight container. In local/test environments, `qdrant-client` supports embedded file/in-memory mode (`:memory:` or local directory) with the exact same API, enabling zero-friction automated testing without requiring a live daemon.
3. Every stored chunk retains `document_id`, `chunk_id`, `title`, `page`, `section`, and `effective_dates`.

## Alternatives Considered
- **pgvector (Postgres extension):** Feasible, but couples vector indexing with operational relational queries, and requires compiling or loading specific Postgres C extensions on host machines.
- **Pinecone / Weaviate Cloud:** Adds external cloud dependencies and network latency, violating zero-friction local development goals.

## Consequences
- **Positive:** Fast similarity search with first-class payload filtering; deterministic local testing via in-memory Qdrant client; clean separation between tabular business data and semantic knowledge chunks.
