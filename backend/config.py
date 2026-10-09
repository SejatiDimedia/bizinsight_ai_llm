import os
from typing import List
from dotenv import load_dotenv

# Muat variabel environment dari .env
load_dotenv(override=True)


class Settings:
    """Konfigurasi terpusat untuk aplikasi backend BizInsight AI."""

    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    ENV: str = os.getenv("ENVIRONMENT", "development")

    # Database settings
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "bizinsight")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    DB_POOL_MIN: int = int(os.getenv("DB_POOL_MIN", 1))
    DB_POOL_MAX: int = int(os.getenv("DB_POOL_MAX", 10))

    # AI Model settings
    PRIMARY_MODEL: str = os.getenv("PRIMARY_MODEL", "gemini/gemini-3.6-flash")
    FALLBACK_MODEL: str = os.getenv("FALLBACK_MODEL", "groq/openai/gpt-oss-120b")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]


settings = Settings()
