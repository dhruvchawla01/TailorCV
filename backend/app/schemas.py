from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

class GoogleLoginRequest(BaseModel):
    id_token: str

class AuthConfigResponse(BaseModel):
    google_client_id: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Resume / Profile Details Schemas ---
class ContactInfoSchema(BaseModel):
    name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    website: Optional[str] = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""

class ExperienceSchema(BaseModel):
    company: str
    position: str
    location: Optional[str] = ""
    start_date: str
    end_date: Optional[str] = ""  # e.g., "Present" or "2024-05"
    description_bullets: List[str] = Field(default_factory=list)
    current: bool = False

class ProjectSchema(BaseModel):
    title: str
    role: Optional[str] = ""
    description_bullets: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = ""

class SkillSchema(BaseModel):
    name: str
    category: Optional[str] = ""  # e.g., "Languages", "Tools", "Soft Skills"

class CertificationSchema(BaseModel):
    name: str
    issuer: str
    date: Optional[str] = ""
    link: Optional[str] = ""

class AchievementSchema(BaseModel):
    title: str
    description: str
    date: Optional[str] = ""

class EducationSchema(BaseModel):
    school: str
    degree: str
    field_of_study: Optional[str] = ""
    start_date: str
    end_date: Optional[str] = ""
    gpa: Optional[str] = ""

class ResumeSchema(BaseModel):
    contact_info: ContactInfoSchema = Field(default_factory=ContactInfoSchema)
    summary: Optional[str] = ""
    experiences: List[ExperienceSchema] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)
    education: List[EducationSchema] = Field(default_factory=list)
    skills: List[SkillSchema] = Field(default_factory=list)
    certifications: List[CertificationSchema] = Field(default_factory=list)
    achievements: List[AchievementSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- Profile Updates ---
class ProfileUpdate(BaseModel):
    summary: Optional[str] = ""
    contact_info: Optional[ContactInfoSchema] = None
    experiences: Optional[List[ExperienceSchema]] = None
    projects: Optional[List[ProjectSchema]] = None
    education: Optional[List[EducationSchema]] = None
    skills: Optional[List[SkillSchema]] = None
    certifications: Optional[List[CertificationSchema]] = None
    achievements: Optional[List[AchievementSchema]] = None

class ProfileResponse(BaseModel):
    id: int
    user_id: int
    summary: Optional[str] = ""
    contact_info: Optional[ContactInfoSchema] = None
    experiences: Optional[List[ExperienceSchema]] = None
    projects: Optional[List[ProjectSchema]] = None
    education: Optional[List[EducationSchema]] = None
    skills: Optional[List[SkillSchema]] = None
    certifications: Optional[List[CertificationSchema]] = None
    achievements: Optional[List[AchievementSchema]] = None
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Application / JD Processing Schemas ---
class JDInputSchema(BaseModel):
    job_title: str
    company: str
    raw_job_description: str

class JDExtractedSchema(BaseModel):
    job_title: str
    company: str
    responsibilities: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = ""
    certifications: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)

class ATSChecklistItem(BaseModel):
    check_name: str
    passed: bool
    details: str

class KeywordGroupSchema(BaseModel):
    category: str  # Programming Languages, Frameworks, Cloud, Databases, DevOps, Soft Skills, etc.
    required_keywords: List[str] = Field(default_factory=list)
    matched_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)
    percentage: int = 0

class MissingKeywordCategorized(BaseModel):
    critical: List[str] = Field(default_factory=list)      # Required skills, certs, tech
    recommended: List[str] = Field(default_factory=list)   # Nice-to-have, preferred tools
    contextual: List[str] = Field(default_factory=list)    # Industry terminology, domain phrases

class RewriteSuggestion(BaseModel):
    suggestion_id: str
    section_type: str  # 'summary' | 'experience' | 'project'
    item_index: int
    bullet_index: Optional[int] = None
    original_text: str
    suggested_text: str
    explanation: str

class RecommendationItem(BaseModel):
    priority: str  # 'high' | 'medium' | 'low'
    reason: str
    expected_impact: str
    suggested_action: str
    one_click_fix_type: str  # 'apply_rewrite' | 'shorten_bullet' | 'reorder_skills' | 'none'
    target_rewrite_id: Optional[str] = None

class SectionScoreItem(BaseModel):
    section_name: str
    score: int
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)

class RedundancyCheckItem(BaseModel):
    type: str  # 'repeated_project' | 'duplicate_bullet' | 'repeated_technology' | 'overused_phrase'
    content: str
    suggestion: str

class ValidationFlag(BaseModel):
    severity: str  # 'warning' | 'error'
    field: str
    unsupported_statement: str
    suggested_fix: str

class ATSEvaluationSchema(BaseModel):
    # Category Scores (0-100)
    ats_compliance_score: int = Field(..., ge=0, le=100)
    job_match_score: int = Field(..., ge=0, le=100)
    content_quality_score: int = Field(..., ge=0, le=100)
    writing_quality_score: int = Field(..., ge=0, le=100)
    
    # Calculated deterministically by the backend:
    # overall_score = ats_compliance * 0.3 + job_match * 0.4 + content * 0.2 + writing * 0.1
    overall_score: int = Field(default=0, ge=0, le=100)
    
    # Score explanations
    ats_compliance_explanation: str
    job_match_explanation: str
    content_quality_explanation: str
    writing_quality_explanation: str
    
    # Details & checks
    compliance_checklist: List[ATSChecklistItem] = Field(default_factory=list)
    keyword_coverage_groups: List[KeywordGroupSchema] = Field(default_factory=list)
    missing_keywords_categorized: MissingKeywordCategorized = Field(default_factory=MissingKeywordCategorized)
    
    # Strengths & improvements
    strengths: List[str] = Field(default_factory=list)
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    rewrite_suggestions: List[RewriteSuggestion] = Field(default_factory=list)
    section_scores: List[SectionScoreItem] = Field(default_factory=list)
    
    # Summary Insights
    strongest_section: str
    weakest_section: str
    seniority_estimate: str
    recruiter_match_estimate: str
    
    # Quality & compliance checks
    redundancy_checks: List[RedundancyCheckItem] = Field(default_factory=list)
    profile_validation_flags: List[ValidationFlag] = Field(default_factory=list)


class TimelineEventSchema(BaseModel):
    type: str
    timestamp: datetime
    message: str
    notes: Optional[str] = ""

class ApplicationCreate(JDInputSchema):
    job_posting_url: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    job_posting_url: Optional[str] = None
    date_applied: Optional[datetime] = None
    notes: Optional[str] = None
    reminder_date: Optional[datetime] = None
    reminder_notes: Optional[str] = None
    reminder_status: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    uid: str
    user_id: int
    job_title: str
    company: str
    raw_job_description: str
    parsed_job_description: Optional[JDExtractedSchema] = None
    tailored_resume_data: Optional[ResumeSchema] = None
    cover_letter: Optional[str] = None
    ats_score_data: Optional[ATSEvaluationSchema] = None
    status: str
    job_posting_url: Optional[str] = None
    date_applied: Optional[datetime] = None
    notes: Optional[str] = None
    timeline_events: Optional[List[TimelineEventSchema]] = Field(default_factory=list)
    reminder_date: Optional[datetime] = None
    reminder_notes: Optional[str] = None
    reminder_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Bullet point regeneration ---
class BulletRegenerateRequest(BaseModel):
    bullet: str
    job_description: str
    additional_instructions: Optional[str] = ""

class BulletRegenerateResponse(BaseModel):
    options: List[str]  # 3 variations generated by AI
