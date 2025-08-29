"""
Application Configuration Settings
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Viaticos 2025"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:viaticos2025@localhost:5432/viaticos"
    )
    
    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", 
        "viaticos_super_secret_key_2025_change_in_production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # SMTP Settings
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "viaticos@company.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "change_me")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    
    # File Upload Settings
    UPLOAD_PATH: str = os.getenv("UPLOAD_PATH", "/app/storage/uploads")
    EXPORT_PATH: str = os.getenv("EXPORT_PATH", "/app/storage/exports")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    
    # Security
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://frontend:3000"]
    
    # Internationalization
    DEFAULT_LANGUAGE: str = "es"
    SUPPORTED_LANGUAGES: List[str] = ["es", "en"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# File upload constants
ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".gif"]
