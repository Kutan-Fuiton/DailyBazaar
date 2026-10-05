"""
core/config.py — Reads settings from common root .env via pydantic-settings.
All other modules import `settings` from here — never import os.getenv directly.
"""
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Path resolution for unified root .env
_CORE_DIR = Path(__file__).resolve().parent
_APP_DIR = _CORE_DIR.parent
_BACKEND_DIR = _APP_DIR.parent
_ROOT_DIR = _BACKEND_DIR.parent

_ENV_PATHS = [
    str(_ROOT_DIR / ".env"),
    str(_BACKEND_DIR / ".env"),
    ".env",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_PATHS,
        extra="ignore",
        env_file_encoding="utf-8",
    )

    APP_NAME: str = "Vaniq"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Supabase PostgreSQL
    SUPABASE_DB_URL: Optional[str] = None
    
    # Fallback MySQL configuration
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_MAIN_DB: str = "vaniq_main"

    # Redis Distributed Cache & Pub/Sub
    REDIS_URL: str = "redis://127.0.0.1:6379/0"

    # JWT & Security Tokens
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15   # 15 minutes short-lived
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7      # 7 days rotating refresh token
    RESET_TOKEN_EXPIRE_MINUTES: int = 30    # 30 minutes password reset window

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v or v.strip() == "change_me":
            raise ValueError(
                "SECRET_KEY is insecure or unset. Please specify a secure random SECRET_KEY in backend/.env"
            )
        return v

    # CORS
    FRONTEND_URL: str = "http://localhost:5174"

    # OCR / LlamaParsing
    HF_TOKEN: str = ""
    LLAMA_API_KEY: str = ""
    OCR_ITEMS_JSON: str = "app/ocr/items.json"


settings = Settings()
