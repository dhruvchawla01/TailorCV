import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Resolve .env file path relative to this configuration file
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
env_path = os.path.join(backend_dir, ".env")

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "AI Resume Tailoring Platform"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeychangeinprod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    # Default to local SQLite database in working directory
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resume_tailor.db")
    
    # OpenAI Settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    OPENAI_PARSER_MODEL: str = os.getenv("OPENAI_PARSER_MODEL", "gpt-5.4-nano")
    OPENAI_TAILOR_MODEL: str = os.getenv("OPENAI_TAILOR_MODEL", "gpt-5.4-mini")
    
    # Optional Google OAuth settings (keys to be configured by the user if needed)
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    model_config = SettingsConfigDict(
        env_file=env_path,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()



 