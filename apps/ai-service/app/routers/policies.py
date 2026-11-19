"""
Policy ingestion and retrieval endpoints.
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.services.rag_service import ingest_chunks, retrieve_policy_chunks
from app.models.schemas import PolicyCitation

router = APIRouter()


def _verify_token(authorization: str | None) -> None:
    expected = f"Bearer {settings.INTERNAL_SERVICE_TOKEN}"
    if not authorization or authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid internal service token")


class IngestChunksRequest(BaseModel):
    chunks: list[dict]


class IngestChunksResponse(BaseModel):
    upserted: int
    message: str


class RetrieveRequest(BaseModel):
    query: str
    tenant_id: str
    category_filter: Optional[str] = None
    top_k: int = 5


class RetrieveResponse(BaseModel):
    citations: list[PolicyCitation]
    total: int


@router.post("/policies/ingest", response_model=IngestChunksResponse)
async def ingest_policy_chunks(
    request: IngestChunksRequest,
    authorization: str | None = Header(default=None),
) -> IngestChunksResponse:
    _verify_token(authorization)
    upserted = ingest_chunks(request.chunks)
    return IngestChunksResponse(upserted=upserted, message=f"Ingested {upserted} chunks into Qdrant")


@router.post("/policies/retrieve", response_model=RetrieveResponse)
async def retrieve_policies(
    request: RetrieveRequest,
    authorization: str | None = Header(default=None),
) -> RetrieveResponse:
    _verify_token(authorization)
    citations = retrieve_policy_chunks(
        query=request.query,
        tenant_id=request.tenant_id,
        category_filter=request.category_filter,
        top_k=request.top_k,
    )
    return RetrieveResponse(citations=citations, total=len(citations))
