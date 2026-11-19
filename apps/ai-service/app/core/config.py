import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(dotenv_path="../../.env", override=False)
load_dotenv(override=False)   # also load local .env if present

class Settings(BaseSettings):
    PROJECT_NAME: str = "AttendWise AI Service"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/internal/v1"

    # Qdrant
    QDRANT_URL: str = ":memory:"
    QDRANT_API_KEY: str = ""

    # LLM — supports groq | openai | mock
    LLM_PROVIDER: str = "mock"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "openai/gpt-oss-120b"   # working model on free Groq tier

    # Groq alias: if GROQ_API_KEY is set and LLM_API_KEY is empty, use it
    GROQ_API_KEY: str = ""

    # Embeddings — groq has no embedding API; use mock or openai
    EMBEDDING_PROVIDER: str = "mock"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    INTERNAL_SERVICE_TOKEN: str = "dev-secret-internal-service-token-1234"
    CORE_API_URL: str = "http://localhost:3001"

    def model_post_init(self, __context) -> None:
        # Allow GROQ_API_KEY as alias for LLM_API_KEY when provider is groq
        if self.LLM_PROVIDER.lower() == "groq" and not self.LLM_API_KEY and self.GROQ_API_KEY:
            object.__setattr__(self, "LLM_API_KEY", self.GROQ_API_KEY)
        # Map unavailable llama model to working alternative on this Groq account
        if self.LLM_PROVIDER.lower() == "groq" and self.LLM_MODEL in (
            "llama-3.3-70b-versatile", "llama-3.1-70b-versatile",
            "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768",
        ):
            object.__setattr__(self, "LLM_MODEL", "openai/gpt-oss-120b")

    class Config:
        env_file = "../../.env"
        extra = "ignore"

settings = Settings()
