# API Documentation — TailorCV

---

## 1. Cover Page

```text
================================================================================
                    TAILORCV — REST API DOCUMENTATION
================================================================================
Document Title:      OpenAPI 3.0 Specification & Endpoint Documentation
API Version:         v1.0.0
Base URL:            http://localhost:8000/api/v1 (Local)
                     https://api.tailorcv.com/api/v1 (Production)
Document Date:       July 18, 2026
Protocol:            HTTPS / RESTful JSON & Binary PDF Streams
Authentication:      Bearer JWT Token (Header: Authorization: Bearer <token>)
================================================================================
```

---

## 2. Revision History

| Version | Date | Author | Description of API Changes | Status |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | July 15, 2026 | API Core Team | Initial draft for Auth and Profile endpoints | Draft |
| **1.0.0** | July 18, 2026 | Lead Architect | Finalized spec with Google SSO, TipTap AI regenerator, & PDF endpoints | **Approved** |

---

## 3. Introduction

Welcome to the **TailorCV REST API Documentation**. The TailorCV API enables job seekers and client applications to interact programmatically with candidate Master Profiles, execute AI-driven job description parsing, evaluate ATS compatibility scores, customize resume content, and export high-fidelity PDF documents.

Automatic interactive API documentation is available via OpenAPI / Swagger UI at `/api/v1/docs` or ReDoc at `/api/v1/redoc`.

---

## 4. API Overview

* **Architectural Style**: RESTful HTTP API.
* **Format**: All request bodies and response payloads use standard JSON (`application/json`), except document download endpoints which return `application/pdf` or `text/plain` binary streams, and file upload routes using `multipart/form-data`.
* **Timestamp Standard**: All dates and timestamps are formatted in UTC ISO-8601 strings (e.g. `2026-07-18T14:30:00Z`).

---

## 5. Authentication

TailorCV uses **JWT Bearer Token Authentication**. Include your access token in the `Authorization` header of all protected requests:

```http
Authorization: Bearer <your_access_token>
```

### Authentication Methods
1. **Password Authentication**: Obtain token via `POST /api/v1/auth/token` (OAuth2 password form).
2. **Google OAuth 2.0 SSO**: Obtain token via `POST /api/v1/auth/google` supplying a valid Google ID token.

---

## 6. Base URL & Versioning

All API paths are prefixed with the API version segment `/api/v1`:

* **Local Environment**: `http://localhost:8000/api/v1`
* **Production Environment**: `https://api.tailorcv.com/api/v1`

---

## 7. Request & Response Standards

### Success Response Envelope
Successful HTTP requests return appropriate standard status codes (`200 OK`, `201 Created`, `204 No Content`) with typed JSON data.

```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "created_at": "2026-07-18T14:30:00Z"
}
```

---

## 8. Error Handling

When an error occurs, the API returns a structured HTTP error payload with a human-readable `detail` field:

```json
{
  "detail": "Incorrect email or password"
}
```

### Common HTTP Status Codes
* **`200 OK`**: Request succeeded.
* **`201 Created`**: Resource created successfully.
* **`400 Bad Request`**: Validation error, duplicate resource, or invalid token signature.
* **`401 Unauthorized`**: Missing, invalid, or expired JWT bearer token.
* **`404 Not Found`**: Resource does not exist or user lacks permission to view it.
* **`422 Unprocessable Entity`**: Request body failed Pydantic schema validation.
* **`503 Service Unavailable`**: External service (e.g., OpenAI API or Google Auth verification) unavailable.

---

## 9. Authentication Endpoints

### 9.1 Register User
`POST /api/v1/auth/register`

Registers a new email/password user and initializes an empty Master Profile.

* **Request Body** (`application/json`):
  ```json
  {
    "email": "candidate@example.com",
    "password": "securepassword123",
    "full_name": "Jane Doe"
  }
  ```
* **Response** (`201 Created`):
  ```json
  {
    "id": 1,
    "email": "candidate@example.com",
    "full_name": "Jane Doe",
    "created_at": "2026-07-18T14:30:00Z"
  }
  ```

---

### 9.2 Password Login
`POST /api/v1/auth/token`

Authenticates credentials and returns a Bearer access token.

* **Request Body** (`application/x-www-form-urlencoded`):
  - `username`: `candidate@example.com`
  - `password`: `securepassword123`
* **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
  ```

---

### 9.3 Google OAuth SSO Login
`POST /api/v1/auth/google`

Authenticates a user via a Google ID token obtained from Google Identity Services (GIS).

* **Request Body** (`application/json`):
  ```json
  {
    "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
  }
  ```
* **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
  ```

---

### 9.4 Fetch Auth Config
`GET /api/v1/auth/config`

Public endpoint returning authentication configuration status.

* **Response** (`200 OK`):
  ```json
  {
    "google_client_id": "656516980246-1dfedqg0h3fl85egbg7vqmi8l28qspau.apps.googleusercontent.com"
  }
  ```

---

### 9.5 Get Current User (`Me`)
`GET /api/v1/auth/me`

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`):
  ```json
  {
    "id": 1,
    "email": "candidate@example.com",
    "full_name": "Jane Doe",
    "created_at": "2026-07-18T14:30:00Z"
  }
  ```

---

## 10. User Profile Endpoints

### 10.1 Get Master Profile
`GET /api/v1/profile`

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`):
  ```json
  {
    "id": 1,
    "user_id": 1,
    "summary": "Experienced Full Stack Engineer...",
    "contact_info": {
      "name": "Jane Doe",
      "email": "candidate@example.com",
      "phone": "+1 (555) 019-2834",
      "location": "San Francisco, CA",
      "website": "https://janedoe.dev",
      "linkedin": "https://linkedin.com/in/janedoe",
      "github": "https://github.com/janedoe"
    },
    "experiences": [
      {
        "company": "Tech Corp",
        "position": "Senior Software Engineer",
        "location": "San Francisco, CA",
        "start_date": "2022-01",
        "end_date": "Present",
        "description_bullets": [
          "Architected microservices handling 1M+ daily requests.",
          "Optimized PostgreSQL queries reducing latency by 40%."
        ],
        "current": true
      }
    ],
    "skills": [
      { "name": "React", "category": "Frontend" },
      { "name": "FastAPI", "category": "Backend" }
    ],
    "projects": [],
    "education": [],
    "certifications": [],
    "achievements": [],
    "updated_at": "2026-07-18T14:30:00Z"
  }
  ```

---

### 10.2 Update Master Profile
`PUT /api/v1/profile`

* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (`application/json`): `ProfileUpdate` object.
* **Response** (`200 OK`): `ProfileResponse` object.

---

## 11. Resume Management & Parsing Endpoints

### 11.1 Upload Resume File
`POST /api/v1/profile/upload`

Uploads a PDF/DOCX file to parse text and seed the Master Profile via `gpt-5.4-nano`.

* **Headers**: `Authorization: Bearer <token>`
* **Request Payload**: `multipart/form-data` with key `file`.
* **Response** (`200 OK`): `ProfileResponse` object.

---

## 12. Job Description Analysis Endpoints

### 12.1 Check Duplicate Application
`GET /api/v1/applications/check-duplicate?company={company}&job_title={job_title}`

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): List of matching existing application objects.

---

## 13. Resume Tailoring Endpoints

### 13.1 AI Tailor Resume
`POST /api/v1/applications/{id}/tailor`

Executes semantic alignment between Master Profile and Application JD using `gpt-5.4-mini`.

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): Updated `ApplicationResponse` object containing `tailored_resume_data` and `ats_score_data`.

---

### 13.2 Update Tailored Resume Data
`PUT /api/v1/applications/{id}/resume`

Manually updates the tailored resume JSON snapshot for a specific application.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (`application/json`): `ResumeSchema` object.
* **Response** (`200 OK`): `ApplicationResponse` object.

---

## 14. ATS Analysis Endpoints

### 14.1 Evaluate ATS Compatibility
`POST /api/v1/applications/{id}/ats`

Executes standalone ATS scoring evaluation without re-tailoring resume text.

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): Updated `ApplicationResponse` containing `ATSEvaluationSchema`.

---

## 15. Cover Letter Endpoints

### 15.1 Generate Cover Letter
`POST /api/v1/applications/{id}/cover-letter`

Generates an AI cover letter customized for the target job application.

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): `ApplicationResponse` containing `cover_letter` text string.

---

### 15.2 Download Cover Letter TXT
`GET /api/v1/applications/{id}/cover-letter/txt`

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): Content-Type `text/plain` file download.

---

### 15.3 Download Cover Letter PDF
`GET /api/v1/applications/{id}/cover-letter/pdf`

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): Content-Type `application/pdf` binary stream.

---

## 16. Application Tracker Endpoints

### 16.1 List Applications
`GET /api/v1/applications`

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): Array of `ApplicationResponse` objects.

---

### 16.2 Create Application
`POST /api/v1/applications`

* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (`application/json`):
  ```json
  {
    "job_title": "Senior Full Stack Engineer",
    "company": "Stripe",
    "raw_job_description": "We are seeking a senior full stack engineer with React, Python, and cloud infrastructure experience...",
    "job_posting_url": "https://stripe.com/jobs/123"
  }
  ```
* **Response** (`201 Created`): `ApplicationResponse` object with 3-character `uid` (e.g. `E3Z`).

---

### 16.3 Update Application Status & Tracking
`PUT /api/v1/applications/{id}`

* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (`application/json`):
  ```json
  {
    "status": "Applied",
    "notes": "Submitted via company portal on July 18.",
    "reminder_date": "2026-07-25T09:00:00Z",
    "reminder_notes": "Follow up with recruiter Sarah on LinkedIn"
  }
  ```
* **Response** (`200 OK`): Updated `ApplicationResponse` object.

---

### 16.4 Download Tailored Resume PDF
`GET /api/v1/applications/{id}/pdf`

Renders resume via Playwright Chromium.

* **Headers**: `Authorization: Bearer <token>`
* **Response** (`200 OK`): Content-Type `application/pdf` binary file stream.

---

## 17. AI Assistant Endpoints

### 17.1 Regenerate Bullet Point
`POST /api/v1/applications/regenerate-bullet`

Generates 3 alternative metric-driven variations for a selected bullet point.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (`application/json`):
  ```json
  {
    "bullet": "Wrote backend endpoints for application processing.",
    "job_description": "We need high performance Python engineers skilled in FastAPI and async I/O.",
    "additional_instructions": "Focus on quantitative metrics and high throughput speed."
  }
  ```
* **Response** (`200 OK`):
  ```json
  {
    "options": [
      "Engineered 12+ high-throughput FastAPI endpoints, handling 50k+ daily transactions with sub-100ms response times.",
      "Architected async Python API services utilizing FastAPI and PostgreSQL, boosting overall data processing speed by 35%.",
      "Refactored backend application processing pipeline using non-blocking asyncio handlers, achieving 99.9% uptime."
    ]
  }
  ```

---

## 18. Data Models & Schemas

### ATSEvaluationSchema
```json
{
  "ats_compliance_score": 90,
  "job_match_score": 85,
  "content_quality_score": 88,
  "writing_quality_score": 92,
  "overall_score": 88,
  "ats_compliance_explanation": "Clean typography, standard section headers, no multi-column layout errors.",
  "job_match_explanation": "Matches 8 out of 9 core technical requirements.",
  "missing_keywords_categorized": {
    "critical": ["Docker", "Kubernetes"],
    "recommended": ["Redis", "GraphQL"],
    "contextual": ["Microservices Architecture"]
  }
}
```

---

## 19. Rate Limiting & Security

* **Rate Limits**: 100 requests per minute per IP for standard CRUD endpoints; 15 requests per minute for AI generation endpoints (`/tailor`, `/cover-letter`, `/regenerate-bullet`).
* **Security Headers**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, CORS header verification.

---

## 20. API Testing Examples

### Python (httpx) Example
```python
import httpx

headers = {"Authorization": "Bearer YOUR_JWT_ACCESS_TOKEN"}
response = httpx.post(
    "http://localhost:8000/api/v1/applications/1/tailor",
    headers=headers
)
application_data = response.json()
print("Overall ATS Score:", application_data["ats_score_data"]["overall_score"])
```

### JavaScript (fetch) Example
```javascript
const response = await fetch('http://localhost:8000/api/v1/applications/regenerate-bullet', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bullet: 'Built user login screen.',
    job_description: 'Looking for React engineers with Google OAuth SSO experience.'
  })
});
const data = await response.json();
console.log('AI Options:', data.options);
```

---

## 21. Future API Enhancements

1. **GraphQL Query Support**: Allow clients to request custom subsets of candidate application data.
2. **Webhooks Integration**: Send HTTP POST notifications to candidate URLs on interview reminder triggers.
3. **Batch Export Route**: `POST /api/v1/applications/batch-pdf` to export multiple application PDFs in a single `.zip` archive.
