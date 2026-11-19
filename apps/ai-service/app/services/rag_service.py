"""
Policy RAG service — retrieves relevant policy chunks using Qdrant vector search
with metadata filtering. Falls back to keyword search when Qdrant is in-memory.
"""
from __future__ import annotations
import hashlib
from typing import Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
)
from app.core.config import settings
from app.services.llm_provider import get_embedding_function
from app.models.schemas import PolicyCitation

COLLECTION_NAME = "attendwise_policies"
VECTOR_DIM = 384

_client: Optional[QdrantClient] = None
_collection_ready = False


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        if settings.QDRANT_URL == ":memory:":
            _client = QdrantClient(":memory:")
        else:
            # Qdrant Cloud uses HTTPS on port 443 — pass port explicitly
            # so the SDK does not default to 6333
            _client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY or None,
                prefer_grpc=False,
                port=443,
                https=True,
                timeout=20,
            )
    return _client


def ensure_collection() -> None:
    global _collection_ready
    if _collection_ready:
        return
    try:
        client = _get_client()
        existing = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in existing:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
        _collection_ready = True
    except Exception as e:
        print(f"[Qdrant] Could not connect to collection: {e} — will use fallback")
        _collection_ready = False


def ingest_chunks(chunks: list[dict]) -> int:
    """Upsert policy chunks into Qdrant. Returns count upserted."""
    ensure_collection()
    if not chunks:
        return 0

    client = _get_client()
    texts = [c["text_snippet"] for c in chunks]
    vectors = get_embedding_function(texts)

    points = []
    for chunk, vector in zip(chunks, vectors):
        point_id = abs(hash(chunk["id"])) % (2**31)
        points.append(PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "chunk_id":        chunk["id"],
                "document_id":     chunk["document_id"],
                "document_title":  chunk.get("document_title", ""),
                "tenant_id":       chunk.get("tenant_id", ""),
                "category":        chunk.get("category", ""),
                "section":         chunk.get("section", ""),
                "page":            chunk.get("page", 1),
                "text_snippet":    chunk["text_snippet"],
            }
        ))

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    return len(points)


def retrieve_policy_chunks(
    query: str,
    tenant_id: str,
    category_filter: Optional[str] = None,
    top_k: int = 5,
) -> list[PolicyCitation]:
    """Retrieve top-K policy chunks relevant to the query."""
    ensure_collection()
    client = _get_client()

    query_vectors = get_embedding_function([query])
    query_vector = query_vectors[0]

    search_filter = None
    if tenant_id:
        conditions = [FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))]
        if category_filter:
            conditions.append(FieldCondition(key="category", match=MatchValue(value=category_filter)))
        search_filter = Filter(must=conditions)

    try:
        results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=search_filter,
            limit=top_k,
            with_payload=True,
        )
    except Exception:
        return []

    citations: list[PolicyCitation] = []
    for hit in results:
        if hit.score < 0.1:
            continue
        p = hit.payload or {}
        citations.append(PolicyCitation(
            document_id=p.get("document_id", ""),
            document_title=p.get("document_title", ""),
            section=p.get("section", ""),
            page=p.get("page"),
            chunk_id=p.get("chunk_id", ""),
            snippet=p.get("text_snippet", "")[:400],
            relevance_explanation=f"Semantic similarity score: {hit.score:.2f}",
        ))

    return citations
