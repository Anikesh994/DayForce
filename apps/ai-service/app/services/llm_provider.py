"""
LLM provider abstraction.

Supported providers:
  groq   — ChatGroq (free API, fast inference, llama-3.3-70b / mixtral)
  openai — ChatOpenAI
  mock   — FakeListChatModel (deterministic, no API key needed)

Groq is the recommended provider for this demo:
  - Free tier at console.groq.com
  - llama-3.3-70b-versatile gives excellent reasoning quality
  - Extremely fast (tokens/sec much higher than OpenAI)
  - Supports structured JSON output via tool_calls

Embedding:
  Groq does not provide an embedding API.
  Use EMBEDDING_PROVIDER=mock (default) for local dev, or
  EMBEDDING_PROVIDER=openai with a separate OpenAI key for production.
"""
from __future__ import annotations
import math
import hashlib
from app.core.config import settings


def get_llm(temperature: float = 0.1, max_tokens: int = 2048):
    """Return a LangChain chat model for the configured provider."""
    provider = settings.LLM_PROVIDER.lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.LLM_MODEL or "llama-3.3-70b-versatile",
            api_key=settings.LLM_API_KEY,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL or "gpt-4o-mini",
            api_key=settings.LLM_API_KEY,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    # Default: mock — deterministic, no API key
    from langchain_core.language_models.fake import FakeListChatModel
    mock_responses = [
        "Mock LLM response — set LLM_PROVIDER=groq with GROQ_API_KEY for real AI responses."
    ] * 50
    return FakeListChatModel(responses=mock_responses)


def get_embedding_function(texts: list[str]) -> list[list[float]]:
    """
    Return embedding vectors.

    Groq does NOT have an embedding endpoint.
    - If EMBEDDING_PROVIDER=openai: use OpenAI embeddings (1536-dim).
    - Otherwise: return deterministic mock vectors (384-dim hash-based).
      Good enough for demo — Qdrant will rank by relative cosine similarity.
    """
    provider = settings.EMBEDDING_PROVIDER.lower()

    if provider == "openai":
        from langchain_openai import OpenAIEmbeddings
        embedder = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL or "text-embedding-3-small",
            api_key=settings.LLM_API_KEY,
        )
        return embedder.embed_documents(texts)

    # Mock: deterministic pseudo-embeddings (384-dim, hash-based)
    # These are consistent across calls for the same text, so Qdrant similarity
    # still works correctly within the same session.
    def _pseudo_embed(text: str) -> list[float]:
        dim = 384
        vec = []
        for i in range(dim):
            seed = hashlib.md5(f"{text[:80]}-dim{i}".encode()).hexdigest()
            val = (int(seed[:8], 16) / 0xFFFFFFFF) * 2 - 1
            vec.append(val)
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    return [_pseudo_embed(t) for t in texts]
