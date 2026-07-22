import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable to support OAuth-only login later
    google_oauth_id = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    summary = Column(Text, nullable=True)
    contact_info = Column(JSON, nullable=True)  # {email, phone, location, website, linkedin, github}
    experiences = Column(JSON, nullable=True)   # [{company, position, location, start_date, end_date, description_bullets, current}]
    projects = Column(JSON, nullable=True)      # [{title, role, description_bullets, technologies, link}]
    education = Column(JSON, nullable=True)     # [{school, degree, field_of_study, start_date, end_date, gpa}]
    skills = Column(JSON, nullable=True)        # [{name, category}]
    certifications = Column(JSON, nullable=True)# [{name, issuer, date, link}]
    achievements = Column(JSON, nullable=True)  # [{title, description, date}]
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profile")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True, nullable=False) # e.g. "E3Z" (3-character alphanumeric code)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    job_title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    raw_job_description = Column(Text, nullable=False)
    
    parsed_job_description = Column(JSON, nullable=True)
    tailored_resume_data = Column(JSON, nullable=True)
    cover_letter = Column(Text, nullable=True)
    ats_score_data = Column(JSON, nullable=True)
    
    # Tracking fields
    status = Column(String, default="Draft", nullable=False)
    job_posting_url = Column(String, nullable=True)
    date_applied = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    timeline_events = Column(JSON, default=list, nullable=True) # [{type, timestamp, message, notes}]
    
    # Reminders
    reminder_date = Column(DateTime, nullable=True)
    reminder_notes = Column(Text, nullable=True)
    reminder_status = Column(String, default="Pending", nullable=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="applications")
