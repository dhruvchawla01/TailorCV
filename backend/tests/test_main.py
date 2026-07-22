import os
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.config import settings

# Setup a clean in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///d:/Projects/TailorCV/test_resume_tailor.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override database dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)
    # Dispose the engine to release file locks in Windows
    engine.dispose()
    # Remove file
    try:
        if os.path.exists("d:/Projects/TailorCV/test_resume_tailor.db"):
            os.remove("d:/Projects/TailorCV/test_resume_tailor.db")
    except PermissionError:
        pass


client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"

def test_auth_flow():
    # Register a new user
    reg_response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"}
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["email"] == "test@example.com"
    
    # Try duplicate registration
    dup_response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"}
    )
    assert dup_response.status_code == 400

    # Login and get token
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "test@example.com", "password": "password123"}
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    token = login_response.json()["access_token"]
    
    # Fetch current user using token
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test@example.com"
    assert me_response.json()["full_name"] == "Test User"

def test_profile_flow():
    # Get token
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "test@example.com", "password": "password123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch initial profile (should be empty but exist)
    profile_response = client.get("/api/v1/profile", headers=headers)
    assert profile_response.status_code == 200
    assert profile_response.json()["summary"] == ""

    # Update profile
    update_payload = {
        "summary": "Experienced python developer.",
        "contact_info": {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+1 (555) 000-0000",
            "location": "New York, NY",
            "website": "https://test.dev",
            "linkedin": "",
            "github": ""
        },
        "experiences": [
            {
                "company": "Test Company",
                "position": "Junior Engineer",
                "location": "New York, NY",
                "start_date": "2022-01",
                "end_date": "2023-12",
                "description_bullets": ["Wrote neat python services.", "Optimized queries."],
                "current": False
            }
        ],
        "projects": [],
        "skills": [{"name": "Python", "category": "Backend"}],
        "certifications": [],
        "achievements": []
    }
    
    put_response = client.put("/api/v1/profile", json=update_payload, headers=headers)
    assert put_response.status_code == 200
    assert put_response.json()["summary"] == "Experienced python developer."
    assert len(put_response.json()["experiences"]) == 1
    assert put_response.json()["experiences"][0]["company"] == "Test Company"

def test_application_flow():
    # Get token
    login_response = client.post(
        "/api/v1/auth/token",
        data={"username": "test@example.com", "password": "password123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create new application (mock parsing handles JD extraction)
    app_payload = {
        "job_title": "Senior Python Engineer",
        "company": "Future Corp",
        "raw_job_description": "We are seeking a senior python engineer with experience in FastAPI and React."
    }
    create_response = client.post("/api/v1/applications", json=app_payload, headers=headers)
    assert create_response.status_code == 201
    app_data = create_response.json()
    app_id = app_data["id"]
    assert app_data["job_title"] == "Senior Python Engineer"
    
    # Assert tracking default values & UID
    assert "uid" in app_data
    assert len(app_data["uid"]) == 3
    assert app_data["status"] == "Draft"
    assert len(app_data["timeline_events"]) == 1
    assert app_data["timeline_events"][0]["type"] == "created"
    
    # Verify Duplicate Check Endpoint
    dupe_response = client.get(
        f"/api/v1/applications/check-duplicate?company={app_payload['company']}&job_title={app_payload['job_title']}",
        headers=headers
    )
    assert dupe_response.status_code == 200
    assert len(dupe_response.json()) >= 1
    assert dupe_response.json()[0]["id"] == app_id
    
    # List applications
    list_response = client.get("/api/v1/applications", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1

    # Tailor resume for this application (mock handles tailoring & ATS)
    tailor_response = client.post(f"/api/v1/applications/{app_id}/tailor", headers=headers)
    assert tailor_response.status_code == 200
    assert tailor_response.json()["tailored_resume_data"] is not None
    ats_data = tailor_response.json()["ats_score_data"]
    assert ats_data is not None
    assert "ats_compliance_score" in ats_data
    assert "job_match_score" in ats_data
    assert "content_quality_score" in ats_data
    assert "writing_quality_score" in ats_data
    assert "overall_score" in ats_data
    
    # Verify deterministic scoring formula: Compliance 30%, Match 40%, Content 20%, Writing 10%
    expected_overall = int(
        ats_data["ats_compliance_score"] * 0.3 +
        ats_data["job_match_score"] * 0.4 +
        ats_data["content_quality_score"] * 0.2 +
        ats_data["writing_quality_score"] * 0.1
    )
    assert ats_data["overall_score"] == expected_overall
    assert len(ats_data["compliance_checklist"]) > 0
    assert len(ats_data["rewrite_suggestions"]) > 0
    
    # Verify PUT Updates and status change timeline event trigger
    update_payload = {
        "status": "Applied",
        "job_posting_url": "https://linkedin.com/jobs/view/123"
    }
    update_response = client.put(f"/api/v1/applications/{app_id}", json=update_payload, headers=headers)
    assert update_response.status_code == 200
    updated_app = update_response.json()
    assert updated_app["status"] == "Applied"
    assert updated_app["job_posting_url"] == "https://linkedin.com/jobs/view/123"
    # Timeline should have 3 events: created, resume_generated, and status_change
    assert len(updated_app["timeline_events"]) == 3
    assert updated_app["timeline_events"][2]["type"] == "status_change"
    
    # Verify cover letter generation
    cl_response = client.post(f"/api/v1/applications/{app_id}/cover-letter", headers=headers)
    assert cl_response.status_code == 200
    assert "Dear Hiring Manager" in cl_response.json()["cover_letter"]

    # Verify Cover Letter Download endpoints
    txt_cl_response = client.get(f"/api/v1/applications/{app_id}/cover-letter/txt", headers=headers)
    assert txt_cl_response.status_code == 200
    assert txt_cl_response.headers["content-type"].startswith("text/plain")
    assert b"Dear Hiring Manager" in txt_cl_response.content

    pdf_cl_response = client.get(f"/api/v1/applications/{app_id}/cover-letter/pdf", headers=headers)
    assert pdf_cl_response.status_code == 200
    assert pdf_cl_response.headers["content-type"] == "application/pdf"
    assert len(pdf_cl_response.content) > 0

    # Verify Resume PDF print
    pdf_response = client.get(f"/api/v1/applications/{app_id}/pdf", headers=headers)
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert len(pdf_response.content) > 0

@patch("app.routers.auth.settings")
def test_auth_config(mock_settings):
    mock_settings.GOOGLE_CLIENT_ID = "test-google-client-id"
    response = client.get("/api/v1/auth/config")
    assert response.status_code == 200
    assert response.json()["google_client_id"] == "test-google-client-id"

@patch("httpx.AsyncClient.get")
@patch("app.routers.auth.settings")
def test_auth_google_flow(mock_settings, mock_get):
    # Setup mock client ID
    mock_settings.GOOGLE_CLIENT_ID = "test-google-client-id"
    
    # Set up mock response for Google verification API
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={
        "iss": "https://accounts.google.com",
        "sub": "google-oauth-id-12345",
        "aud": "test-google-client-id",
        "email": "google-user@example.com",
        "name": "Google User"
    })
    mock_get.return_value = mock_response
    
    # Test POST /api/v1/auth/google
    response = client.post(
        "/api/v1/auth/google",
        json={"id_token": "mocked_id_token_xyz"}
    )
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    token = response.json()["access_token"]
    
    # Fetch current user using token and check details
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "google-user@example.com"
    assert me_response.json()["full_name"] == "Google User"
