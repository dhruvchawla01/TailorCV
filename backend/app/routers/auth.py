from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile
from app.schemas import UserCreate, UserResponse, Token, GoogleLoginRequest, AuthConfigResponse
from app.auth import get_password_hash, verify_password, create_access_token, decode_access_token
from app.config import settings
import datetime
import httpx

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize an empty profile for this user
    profile = Profile(
        user_id=user.id,
        summary="",
        contact_info={"name": user_in.full_name or "", "email": user_in.email, "phone": "", "location": "", "website": "", "linkedin": "", "github": ""},
        experiences=[],
        projects=[],
        skills=[],
        certifications=[],
        achievements=[]
    )
    db.add(profile)
    db.commit()
    
    return user

@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/config", response_model=AuthConfigResponse)
def get_auth_config():
    return {"google_client_id": settings.GOOGLE_CLIENT_ID or None}

@router.post("/google", response_model=Token)
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authentication is not configured on this server."
        )
        
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(tokeninfo_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to reach Google verification server: {str(e)}"
        )
        
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google token"
        )
        
    idinfo = response.json()
    
    # Verify issuer
    if idinfo.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token issuer"
        )
        
    # Verify audience matches client ID
    if idinfo.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audience mismatch. Unrecognized client application."
        )
        
    email = idinfo.get("email")
    google_id = idinfo.get("sub")
    full_name = idinfo.get("name")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided in Google account information."
        )
        
    # Check if user exists by google_oauth_id or email
    user = db.query(User).filter((User.google_oauth_id == google_id) | (User.email == email)).first()
    
    if not user:
        # Create a new user
        user = User(
            email=email,
            google_oauth_id=google_id,
            full_name=full_name,
            hashed_password=None  # Google OAuth user doesn't require password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Initialize an empty profile for this user
        profile = Profile(
            user_id=user.id,
            summary="",
            contact_info={
                "name": full_name or "",
                "email": email,
                "phone": "",
                "location": "",
                "website": "",
                "linkedin": "",
                "github": ""
            },
            experiences=[],
            projects=[],
            skills=[],
            certifications=[],
            achievements=[]
        )
        db.add(profile)
        db.commit()
    else:
        # If user existed via password but hasn't linked google_oauth_id yet
        if not user.google_oauth_id:
            user.google_oauth_id = google_id
            if not user.full_name and full_name:
                user.full_name = full_name
            db.commit()
            db.refresh(user)
            
    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email}
    )
    return {"access_token": access_token, "token_type": "bearer"}
