from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import investigate, policies

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "AttendWise AI Service — LangChain + LangGraph investigation pipeline, "
        "Qdrant RAG policy retrieval, Pydantic v2 validated outputs."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(investigate.router, prefix=settings.API_PREFIX, tags=["Investigation"])
app.include_router(policies.router,    prefix=settings.API_PREFIX, tags=["Policies"])


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status":             "healthy",
        "service":            settings.PROJECT_NAME,
        "version":            settings.VERSION,
        "llm_provider":       settings.LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "qdrant_url":         settings.QDRANT_URL,
    }
