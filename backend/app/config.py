import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional

class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str  # Service role key or anon key depending on access control
    
    # Groq Configuration for AI Summaries
    GROQ_API_KEY: str
    
    # Reddit API Configuration (For global/custom subreddits crawling)
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    REDDIT_USER_AGENT: str = "ai-content-crawler:v1.0.0 (by /u/anonymous)"
    
    # GitHub Configuration
    GITHUB_TOKEN: Optional[str] = None
    
    # API Configurations
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Content Crawler"

    # Environment and Hardening Configurations
    ENV: str = "development"  # development / production
    ALLOWED_ORIGINS: str = "*"  # Comma-separated list of origins
    LOG_LEVEL: str = "INFO"
    DATABASE_URL: Optional[str] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_database_url(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        import urllib.parse
        sanitized = v
        if v.startswith("postgresql://") or v.startswith("postgres://"):
            scheme = "postgresql://" if v.startswith("postgresql://") else "postgres://"
            remaining = v[len(scheme):]
            parts = remaining.rsplit("@", 1)
            if len(parts) == 2:
                user_pass = parts[0]
                host_db = parts[1]
                user_pass_parts = user_pass.split(":", 1)
                if len(user_pass_parts) == 2:
                    username = user_pass_parts[0]
                    password = user_pass_parts[1]
                    decoded_password = urllib.parse.unquote(password)
                    encoded_password = urllib.parse.quote_plus(decoded_password)
                    sanitized = f"{scheme}{username}:{encoded_password}@{host_db}"
        
        # Sync with os.environ for Alembic
        os.environ["DATABASE_URL"] = sanitized
        return sanitized

    # Environment file config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
