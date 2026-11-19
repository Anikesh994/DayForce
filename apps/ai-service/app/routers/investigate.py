"""
AI Service — /internal/v1/investigate endpoint.
Called by the Inngest workflow worker after exception detection.
"""
from fastapi import APIRouter, HTTPException, Header
from app.core.config import settings
from app.models.schemas import InvestigateRequest, FullInvestigationResponse
from app.agents.investigation_graph import run_investigation

router = APIRouter()


def _verify_token(authorization: str | None) -> None:
    expected = f"Bearer {settings.INTERNAL_SERVICE_TOKEN}"
    if not authorization or authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid internal service token")


@router.post("/investigate", response_model=FullInvestigationResponse)
async def investigate(
    request: InvestigateRequest,
    authorization: str | None = Header(default=None),
) -> FullInvestigationResponse:
    _verify_token(authorization)
    try:
        result = run_investigation(request)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(exc)}")
