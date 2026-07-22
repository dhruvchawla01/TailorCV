from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Application, Profile, User
from app.schemas import (
    ApplicationResponse, ApplicationCreate, ApplicationUpdate, ResumeSchema, 
    ATSEvaluationSchema, BulletRegenerateRequest, BulletRegenerateResponse
)
from app.routers.auth import get_current_user
from app.ai.client import ai_client
from app.pdf.generator import pdf_generator
from typing import List, Optional
import io
import datetime
import random
import string

router = APIRouter(prefix="/applications", tags=["Applications"])

def generate_unique_uid(db: Session) -> str:
    while True:
        # 3-character alphanumeric code using digits 0-9 and capital letters A-Z
        uid = "".join(random.choices(string.ascii_uppercase + string.digits, k=3))
        exists = db.query(Application).filter(Application.uid == uid).first()
        if not exists:
            return uid

@router.get("", response_model=List[ApplicationResponse])
def get_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    apps = db.query(Application).filter(Application.user_id == current_user.id).order_by(Application.created_at.desc()).all()
    return apps

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    app_in: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Parse Job Description first using AI
    try:
        parsed_jd = await ai_client.analyze_job_description(app_in.raw_job_description)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse job description using AI: {str(e)}"
        )

    # Initialize tailored resume data from the master profile if it exists
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    tailored_data = None
    if profile:
        # Default to master profile initially (before explicit tailoring is run)
        tailored_data = {
            "summary": profile.summary or "",
            "contact_info": profile.contact_info or {},
            "experiences": profile.experiences or [],
            "projects": profile.projects or [],
            "education": profile.education or [],
            "skills": profile.skills or [],
            "certifications": profile.certifications or [],
            "achievements": profile.achievements or []
        }

    uid = generate_unique_uid(db)
    now = datetime.datetime.utcnow()
    initial_timeline = [{
        "type": "created",
        "timestamp": now.isoformat(),
        "message": "Application Tracker Created",
        "notes": f"Unique identifier {uid} generated."
    }]

    app = Application(
        uid=uid,
        user_id=current_user.id,
        job_title=app_in.job_title,
        company=app_in.company,
        raw_job_description=app_in.raw_job_description,
        job_posting_url=app_in.job_posting_url,
        parsed_job_description=parsed_jd.model_dump() if parsed_jd else None,
        tailored_resume_data=tailored_data,
        status="Draft",
        timeline_events=initial_timeline
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

@router.get("/check-duplicate", response_model=List[ApplicationResponse])
def check_duplicate(
    company: str,
    job_title: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check case-insensitive match for company and job title
    dupes = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.company.ilike(company.strip()),
        Application.job_title.ilike(job_title.strip())
    ).all()
    return dupes

@router.get("/{app_id}", response_model=ApplicationResponse)
def get_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()
    return

@router.post("/{app_id}/tailor", response_model=ApplicationResponse)
async def tailor_resume(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=400,
            detail="Please build/upload your master profile first before tailoring."
        )

    profile_data = {
        "summary": profile.summary or "",
        "contact_info": profile.contact_info or {},
        "experiences": profile.experiences or [],
        "projects": profile.projects or [],
        "education": profile.education or [],
        "skills": profile.skills or [],
        "certifications": profile.certifications or [],
        "achievements": profile.achievements or []
    }
    
    # Run the Tailoring Engine
    try:
        tailored_resume = await ai_client.tailor_resume(profile_data, app.parsed_job_description)
        app.tailored_resume_data = tailored_resume.model_dump()
        
        # Run ATS Review on tailored resume automatically
        ats_evaluation = await ai_client.evaluate_ats(app.tailored_resume_data, app.parsed_job_description)
        app.ats_score_data = ats_evaluation.model_dump()
        
        # Add event to timeline
        current_events = list(app.timeline_events or [])
        current_events.append({
            "type": "resume_generated",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "message": "Resume Tailored & Optimized",
            "notes": f"ATS overall score assessed: {ats_evaluation.overall_score}%"
        })
        app.timeline_events = current_events
        
        db.commit()
        db.refresh(app)
        return app
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tailoring failed: {str(e)}"
        )

@router.put("/{app_id}/resume", response_model=ApplicationResponse)
def update_tailored_resume(
    app_id: int,
    resume_in: ResumeSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.tailored_resume_data = resume_in.model_dump()
    db.commit()
    db.refresh(app)
    return app

@router.post("/{app_id}/ats", response_model=ApplicationResponse)
async def evaluate_ats_score(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if not app.tailored_resume_data:
        raise HTTPException(
            status_code=400,
            detail="Tailored resume data does not exist yet. Please run tailoring first."
        )
        
    try:
        ats_evaluation = await ai_client.evaluate_ats(app.tailored_resume_data, app.parsed_job_description)
        app.ats_score_data = ats_evaluation.model_dump()
        db.commit()
        db.refresh(app)
        return app
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ATS Evaluation failed: {str(e)}")

@router.post("/{app_id}/cover-letter", response_model=ApplicationResponse)
async def generate_cover_letter(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Use tailored resume (if exists) or master profile
    profile_source = app.tailored_resume_data
    if not profile_source:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=400, detail="Please create a master profile first.")
        profile_source = {
            "summary": profile.summary or "",
            "contact_info": profile.contact_info or {},
            "experiences": profile.experiences or [],
            "projects": profile.projects or [],
            "education": profile.education or [],
            "skills": profile.skills or [],
            "certifications": profile.certifications or [],
            "achievements": profile.achievements or []
        }
        
    try:
        cover_letter = await ai_client.generate_cover_letter(profile_source, app.parsed_job_description)
        app.cover_letter = cover_letter
        
        # Add timeline event
        current_events = list(app.timeline_events or [])
        current_events.append({
            "type": "cover_letter_generated",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "message": "Cover Letter Generated",
            "notes": f"Generated for {app.company}"
        })
        app.timeline_events = current_events
        
        db.commit()
        db.refresh(app)
        return app
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

@router.get("/{app_id}/pdf")
async def get_pdf(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    resume_data = app.tailored_resume_data
    if not resume_data:
        raise HTTPException(status_code=400, detail="Tailored resume data not found.")
        
    try:
        pdf_bytes = await pdf_generator.generate_resume_pdf(resume_data)
        
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        name = "Applicant"
        if profile and profile.contact_info:
            name = profile.contact_info.get("name", "Applicant").strip().replace(" ", "_")
        filename = f"Resume_{name}_{app.uid}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.post("/regenerate-bullet", response_model=BulletRegenerateResponse)
async def regenerate_bullet(
    req: BulletRegenerateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        options = await ai_client.regenerate_bullet_points(
            req.bullet, req.job_description, req.additional_instructions
        )
        return {"options": options}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bullet regeneration failed: {str(e)}")

@router.put("/{app_id}", response_model=ApplicationResponse)
def update_application(
    app_id: int,
    app_update: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    update_data = app_update.model_dump(exclude_unset=True)
    
    # If status changes, log a timeline event
    if "status" in update_data and update_data["status"] != app.status:
        old_status = app.status
        new_status = update_data["status"]
        
        current_events = list(app.timeline_events or [])
        current_events.append({
            "type": "status_change",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "message": f"Status updated to: {new_status}",
            "notes": f"Changed status from '{old_status}' to '{new_status}'"
        })
        app.timeline_events = current_events
        
        # Auto-set date_applied if moving past draft
        if new_status not in ["Draft", "Ready to Apply"] and "date_applied" not in update_data and not app.date_applied:
            update_data["date_applied"] = datetime.datetime.utcnow()
            
    for key, value in update_data.items():
        setattr(app, key, value)
        
    db.commit()
    db.refresh(app)
    return app

@router.get("/{app_id}/cover-letter/txt")
def get_cover_letter_txt(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app or not app.cover_letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
        
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    name = "Applicant"
    if profile and profile.contact_info:
        name = profile.contact_info.get("name", "Applicant").strip().replace(" ", "_")
    filename = f"Cover_Letter_{name}_{app.uid}.txt"
    
    return StreamingResponse(
        io.BytesIO(app.cover_letter.encode("utf-8")),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{app_id}/cover-letter/pdf")
async def get_cover_letter_pdf_endpoint(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app or not app.cover_letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
        
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    contact_info = profile.contact_info if (profile and profile.contact_info) else {}
    
    try:
        pdf_bytes = await pdf_generator.generate_cover_letter_pdf(app.cover_letter, contact_info)
        
        name = contact_info.get("name", "Applicant").strip().replace(" ", "_")
        filename = f"Cover_Letter_{name}_{app.uid}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Cover Letter PDF: {str(e)}")
