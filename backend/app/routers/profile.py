from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Profile, User
from app.schemas import ProfileResponse, ProfileUpdate, ResumeSchema
from app.routers.auth import get_current_user
from app.ai.client import ai_client
import pypdf
import docx
import io

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("", response_model=ProfileResponse)
def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
        
    db.commit()
    db.refresh(profile)
    return profile

def extract_text_from_pdf(file_bytes: bytes) -> str:
    pdf_file = io.BytesIO(file_bytes)
    reader = pypdf.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text.strip()

def extract_text_from_docx(file_bytes: bytes) -> str:
    docx_file = io.BytesIO(file_bytes)
    doc = docx.Document(docx_file)
    text = []
    for paragraph in doc.paragraphs:
        text.append(paragraph.text)
    return "\n".join(text).strip()

@router.post("/upload", response_model=ProfileResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename.lower()
    file_bytes = await file.read()
    
    parsed_resume: ResumeSchema = None
    
    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
        if not text:
            # If PDF text extraction yields nothing, it might be scanned. Try vision parsing or raise error.
            # For simplicity, we can pass image bytes to OpenAI if it's scanned, or let the user know.
            # We will try parsing scanned PDF with vision if we can convert pages, but since we are not installing pdf2image (which requires system poppler),
            # we will send the raw text to OpenAI. If text is empty, raise error.
            raise HTTPException(
                status_code=400,
                detail="PDF appears to be scanned or empty. Please use a text-based PDF or upload an image."
            )
        parsed_resume = await ai_client.parse_resume_text(text)
    
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
        if not text:
            raise HTTPException(status_code=400, detail="DOCX file is empty.")
        parsed_resume = await ai_client.parse_resume_text(text)
        
    elif filename.endswith((".png", ".jpg", ".jpeg")):
        # Image upload - use vision
        parsed_resume = await ai_client.parse_resume_image(file_bytes, file.content_type)
        
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload PDF, DOCX, or Image (PNG/JPG)."
        )
        
    if not parsed_resume:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse resume using AI."
        )

    # Save to profile database
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        
    profile.summary = parsed_resume.summary
    profile.contact_info = parsed_resume.contact_info.model_dump()
    profile.experiences = [exp.model_dump() for exp in parsed_resume.experiences]
    profile.projects = [proj.model_dump() for proj in parsed_resume.projects]
    profile.skills = [skill.model_dump() for skill in parsed_resume.skills]
    profile.certifications = [cert.model_dump() for cert in parsed_resume.certifications]
    profile.achievements = [ach.model_dump() for ach in parsed_resume.achievements]
    
    db.commit()
    db.refresh(profile)
    return profile
