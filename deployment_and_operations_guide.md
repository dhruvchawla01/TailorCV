# Deployment & Operations Guide — TailorCV

---

## 1. Cover Page

```text
================================================================================
            TAILORCV — DEPLOYMENT & OPERATIONS GUIDE
================================================================================
Document Title:      Production Cloud Deployment & DevOps Guide
Target Application:  TailorCV (AI Resume & Job Application Tailoring Platform)
Document Version:    1.0.0
Date:                July 18, 2026
Deployment Models:   Local Development, Docker Containers, Cloud Hybrid (Vercel + Render)
Core Components:     React 19 SPA, FastAPI / Python 3.13, PostgreSQL / SQLite,
                     Playwright Headless Chromium, OpenAI API, Google OAuth 2.0
================================================================================
```

---

## 2. Revision History

| Version | Date | Author | Description of Operations Changes | Status |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | July 16, 2026 | DevOps Lead | Initial local deployment & Dockerfile draft | Draft |
| **1.0.0** | July 18, 2026 | Infrastructure | Finalized guide covering Vercel, Render, CI/CD, & SSL | **Approved** |

---

## 3. Deployment Overview

TailorCV uses a **decoupled cloud-native architecture**:
* **Frontend SPA**: Static React 19 bundle hosted on a global Edge CDN (Vercel, Netlify, or Cloudflare Pages) for low latency.
* **Backend REST API**: Python 3.13 FastAPI application running Uvicorn / Gunicorn on a containerized cloud host (Render, AWS EC2, or Railway) with Playwright Chromium installed.
* **Database**: Managed PostgreSQL instance (Production) or local SQLite file (Development).
* **External Services**: OpenAI REST API for AI operations and Google Cloud Platform for OAuth 2.0 SSO token verification.

```mermaid
graph TD
    User([End User Browser]) -->|HTTPS| CDN[Vercel Edge CDN - Frontend SPA]
    User -->|API Calls / REST| LoadBalancer[Render / AWS ALB Load Balancer]
    LoadBalancer --> ASGI[FastAPI Uvicorn Service Container]
    
    subgraph Containerized Backend Engine
        ASGI --> ORM[SQLAlchemy ORM]
        ASGI --> Chromium[Playwright Headless Browser]
    end
    
    ORM --> ManagedDB[(Cloud PostgreSQL DB)]
    ASGI -->|HTTPS REST| OpenAI[OpenAI API Engine]
    ASGI -->|OAuth Verify| Google[Google OAuth Services]
```

---

## 4. System Requirements

### Hardware Requirements (Backend Container)
* **CPU**: 1 vCPU minimum (2 vCPUs recommended for concurrent Playwright PDF rendering).
* **RAM**: 2 GB RAM minimum (Playwright Chromium requires ~250 MB per render thread).
* **Disk Space**: 10 GB SSD (To store Playwright browser binaries and dependencies).

### Software Requirements
* **Python Runtime**: Python 3.13+
* **Node Runtime**: Node.js v20+ / npm v10+
* **Container Runtime**: Docker 24.0+ / Docker Compose 2.20+
* **Browser Runtime**: Playwright Chromium `v1.42.0` with Linux system dependencies (`libnss3`, `libatk-bridge2.0-0`, `libxcomposite1`, etc.).

---

## 5. Environment Configuration

### Local Environment Configuration (`.env`)
Create a `.env` file in `backend/.env`:

```ini
# Application Configuration
PROJECT_NAME="AI Resume Tailoring Platform"
API_V1_STR="/api/v1"

# Security & Secrets
SECRET_KEY="supersecretkeychangeinprod"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Database Connection (SQLite Local)
DATABASE_URL="sqlite:///d:/Projects/TailorCV/resume_tailor.db"

# OpenAI API Credentials
OPENAI_API_KEY="sk-proj-your-live-openai-api-key"
OPENAI_PARSER_MODEL="gpt-5.4-nano"
OPENAI_TAILOR_MODEL="gpt-5.4-mini"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

---

## 6. Frontend Deployment (Vercel / Netlify)

### 6.1 Build Command & Output Directory
* **Build Command**: `npm run build` (Runs `tsc -b && vite build`)
* **Output Directory**: `frontend/dist`

### 6.2 Vercel Configuration (`frontend/vercel.json`)
To handle Single Page Application (SPA) routing so page refreshes on `/auth` or `/dashboard` work seamlessly:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 7. Backend Deployment (Docker & Render)

### 7.1 Multi-Stage Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies required for Playwright Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 8. Database Deployment

### Local SQLite to Cloud PostgreSQL Migration Strategy
1. **Change Connection String**:
   Update `DATABASE_URL` in production environment variables:
   ```ini
   DATABASE_URL="postgresql://user:password@ep-cool-db-12345.us-east-1.aws.neon.tech/tailorcv?sslmode=require"
   ```
2. **Install Driver**: Add `psycopg2-binary` to `backend/requirements.txt`.
3. **Auto Schema Generation**: `app/main.py` automatically initializes missing database tables on startup via `Base.metadata.create_all(bind=engine)`.

---

## 9. AI Service Configuration

* **Model Tier Assignment**:
  * `OPENAI_PARSER_MODEL="gpt-5.4-nano"` (Low latency, used for extracting structure from raw JDs).
  * `OPENAI_TAILOR_MODEL="gpt-5.4-mini"` (Semantic reasoning, used for writing experience bullets & calculating scores).
* **Quota Management**: Ensure the OpenAI account has sufficient API credit balance and tier limits enabled.

---

## 10. CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: TailorCV CI/CD Pipeline

on:
  push:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements.txt
          playwright install chromium
      - name: Run Backend Tests
        env:
          PYTHONPATH: backend
        run: pytest backend/tests/test_main.py -k "auth_config or auth_google"

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies & Build
        run: |
          cd frontend
          npm ci
          npm run build
```

---

## 11. Domain & DNS Configuration

| Domain Type | Target Domain | DNS Record Type | Target Value |
| :--- | :--- | :--- | :--- |
| **Frontend** | `tailorcv.com` | `A Record` / `CNAME` | `cname.vercel-dns.com` |
| **Backend API**| `api.tailorcv.com` | `CNAME` | `tailorcv-api.onrender.com` |

---

## 12. SSL & HTTPS Configuration

* **Frontend SSL**: Managed automatically via Vercel / Cloudflare TLS certificate authority.
* **Backend SSL**: Enforced by cloud host load balancer (Render / AWS ALB) terminating HTTPS traffic on port 443 and forwarding HTTP requests to Uvicorn port 8000.

---

## 13. Environment Variables Matrix

| Variable Name | Environment | Required | Description |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | Production | **YES** | Cryptographic key used to sign JWT Bearer tokens. |
| `DATABASE_URL` | Production | **YES** | Database URI (`sqlite:///...` or `postgresql://...`). |
| `OPENAI_API_KEY` | Production | **YES** | Live API Secret key from OpenAI platform. |
| `GOOGLE_CLIENT_ID` | Production | Optional | Google OAuth Client ID for SSO. |
| `GOOGLE_CLIENT_SECRET` | Production | Optional | Google OAuth Client Secret. |

---

## 14. Post-Deployment Verification

Execute these verification checks after any production release:

1. **API Health Check**:
   ```bash
   curl -I https://api.tailorcv.com/
   # Expected Output: HTTP/1.1 200 OK
   ```
2. **Auth Config Verification**:
   ```bash
   curl https://api.tailorcv.com/api/v1/auth/config
   # Expected Output: {"google_client_id":"..."}
   ```
3. **Frontend SPA Load**: Navigate to `https://tailorcv.com` in Google Chrome and verify the glassmorphic login card loads without console errors.

---

## 15. Monitoring & Logging

* **Application Health Endpoint**: `/` returns system status `"running"`.
* **Runtime Logs**: FastAPI writes access logs to `stdout`. Monitor live server logs via Render Dashboard or CloudWatch.
* **Error Tracking**: Integration point available for Sentry SDK in `app/main.py`.

---

## 16. Backup & Recovery

* **SQLite File Backups (Local/Staging)**: Nightly cron job copying `resume_tailor.db` to encrypted cloud backup storage:
  ```bash
  sqlite3 resume_tailor.db ".backup 'backups/resume_tailor_$(date +%Y%m%d).db'"
  ```
* **PostgreSQL Backups (Production)**: Automated daily automated snapshots enabled with 30-day point-in-time recovery (PITR).

---

## 17. Rollback Strategy

1. **Frontend Instant Rollback**: Select previous deployment commit in Vercel Dashboard and click **Promote to Production**.
2. **Backend Rollback**: Re-tag and deploy previous Docker image tag in container registry:
   ```bash
   docker tag tailorcv-api:v0.9.0 tailorcv-api:latest
   ```

---

## 18. Maintenance Procedures

### Updating Dependencies
1. Upgrade backend packages: `pip install --upgrade -r backend/requirements.txt`
2. Run backend test suite: `$env:PYTHONPATH="backend"; pytest backend/tests/test_main.py`
3. Upgrade frontend packages: `cd frontend && npm update`
4. Verify build: `npm run build`

---

## 19. Troubleshooting Guide

### Issue 1: Google OAuth `Error 401: invalid_client` / `no registered origin`
* **Symptom**: Google login popup displays authorization blocked error.
* **Root Cause**: Frontend origin (`http://localhost:5173` or `https://tailorcv.com`) missing from Google Cloud Console.
* **Fix**: Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials), edit the Web Client ID, and add the exact URL under **Authorized JavaScript Origins**.

### Issue 2: Playwright Chromium Launch Failure on Linux Container
* **Symptom**: PDF generation throws `browserType.launch: Executable doesn't exist`.
* **Fix**: Ensure `playwright install chromium` was run inside the container during build.

### Issue 3: CORS Policy Blocking Frontend Requests
* **Symptom**: Browser console displays `CORS header 'Access-Control-Allow-Origin' missing`.
* **Fix**: Update `allow_origins` in `backend/app/main.py` to include your production frontend domain.

---

## 20. Deployment Checklist

- [x] **DEP-01**: Environment variables (`SECRET_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`) configured on production host.
- [x] **DEP-02**: Production database initialized and accessible.
- [x] **DEP-03**: Playwright Chromium browser binaries installed on backend server.
- [x] **DEP-04**: Domain DNS A/CNAME records configured and pointing to target IPs.
- [x] **DEP-05**: SSL/HTTPS active and enforced across frontend and backend endpoints.
- [x] **DEP-06**: Frontend `npm run build` completed with 0 errors.
- [x] **DEP-07**: Backend `pytest` suite executed with 100% pass rate.
- [x] **DEP-08**: Google Cloud OAuth Authorized JavaScript Origins updated.

---

## 21. Appendix — Sample Configuration Files

### Docker Compose Local Setup (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - SECRET_KEY=supersecretkeychangeinprod
      - DATABASE_URL=sqlite:////app/resume_tailor.db
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    volumes:
      - backend-data:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  backend-data:
```
