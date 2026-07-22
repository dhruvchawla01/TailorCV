import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

db_url = settings.DATABASE_URL

# On Linux (e.g. Render Docker container), sanitize any Windows-specific file paths
if os.name != 'nt' and db_url.startswith("sqlite"):
    if "d:" in db_url.lower() or "c:" in db_url.lower() or "projects" in db_url.lower():
        db_url = "sqlite:////tmp/resume_tailor.db"

# For SQLite databases, let's enable check_same_thread=False
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
