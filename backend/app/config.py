import os
from pydantic_settings import BaseSettings, SettingsConfigDict
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

    # Environment file config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
