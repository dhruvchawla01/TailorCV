# Prompt Library — TailorCV

---

## 1. Cover Page

```text
================================================================================
                    TAILORCV — COMPREHENSIVE PROMPT LIBRARY
================================================================================
Document Title:      AI Pair Programming & Prompt Engineering Library
Target Application:  TailorCV (AI Resume & Application Tailoring Platform)
Document Version:    1.0.0
Date:                July 18, 2026
Methodology:         Role-Task-Context-Constraint Prompt Architecture
Target Models:       Antigravity Agentic Assistant, OpenAI gpt-5.4-mini / nano
================================================================================
```

---

## 2. Revision History

| Version | Date | Author | Description of Changes | Status |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | July 15, 2026 | AI Engineering Team | Initial collection of prompt templates | Draft |
| **1.0.0** | July 18, 2026 | Full Stack Lead | Finalized 25 prompt modules for production Vibe Coding | **Approved** |

---

## 3. Purpose

The **TailorCV Prompt Library** is a curated repository of battle-tested, structured prompts designed to guide AI coding assistants (such as Antigravity) through every phase of software development. It standardizes how developers initiate feature builds, debug errors, refactor code, write unit tests, and tune OpenAI prompt pipelines within the TailorCV codebase.

---

## 4. Prompt Engineering Principles

1. **Role-Task-Context-Constraint Framework**: Every prompt clearly defines the AI's role, the exact deliverable, workspace context, and strict technical boundaries.
2. **JSON Schema Enforcement**: When prompting LLMs for structured data, explicitly request valid JSON and validate outputs via backend Pydantic models.
3. **Empirical Log Verification**: Instruct the AI to inspect raw tracebacks and console output before forming diagnostic hypotheses.
4. **Zero Placeholder Policy**: Demand complete, drop-in production code without truncated snippets or `// TODO: implement later` comments.

---

## 5. Global System Prompt

Below is the foundational system prompt configured for AI assistants working on TailorCV:

```markdown
You are Antigravity, an expert AI agentic coding assistant working on TailorCV.
TailorCV is a full-stack platform built using React 19, TypeScript, Vite, TailwindCSS v4, FastAPI (Python 3.13), SQLAlchemy, and OpenAI (gpt-5.4-mini/nano).

Follow these rules at all times:
1. Always inspect source files using code search tools before suggesting modifications.
2. Maintain strict type safety across TypeScript interfaces and Pydantic schemas.
3. Ensure visual excellence: dark mode glassmorphism (`backdrop-filter: blur(16px)`), curated HSL slate/teal gradients, crisp Inter typography.
4. Never issue superficial symptom fixes (e.g. swallowing exceptions or returning dummy data).
5. Always verify completed work by running test suites (`pytest`) or build checks (`npm run build`).
```

---

## 6. Shared Context Template

Include this snippet at the beginning of complex AI prompts to provide instant repository context:

```text
[PROJECT CONTEXT]
Workspace Root: d:/Projects/TailorCV
Tech Stack: React 19 + TypeScript + Vite (Port 5173), FastAPI + Python 3.13 (Port 8000), SQLite (resume_tailor.db), OpenAI API (gpt-5.4-mini / nano).
Backend API Base: http://localhost:8000/api/v1
Key Files:
- Backend Entrypoint: backend/app/main.py
- DB Schemas & Models: backend/app/models.py, backend/app/schemas.py
- API Routers: backend/app/routers/ (auth.py, profile.py, applications.py)
- Frontend API Client: frontend/src/services/api.ts
- Frontend Auth Screen: frontend/src/pages/Auth.tsx
- Application Editor: frontend/src/pages/ApplicationEditor.tsx
```

---

## 7. Development Prompts

### 7.1 Component Feature Generator
```text
Role: Senior Frontend Engineer
Task: Create a new React component `[ComponentName].tsx` inside `frontend/src/components/`.
Context: Use TailorCV's glassmorphism dark design system (`bg-slate-900/60`, `border-slate-800`, `text-slate-200`).
Constraints: 
- Define all props in a TypeScript interface.
- Use Lucide React icons.
- Support loading and error states cleanly.
```

---

## 8. Planning Prompts

### 8.1 Implementation Plan Scaffolder
```text
Role: Technical Product Manager & Architect
Task: Generate a detailed `implementation_plan.md` for adding [Feature Name].
Structure Required:
1. User Review Required (highlight breaking changes/decisions)
2. Open Questions
3. Proposed Changes (grouped by Backend and Frontend files)
4. Verification Plan (Automated Pytest & Manual UI checks)
Wait for my approval before executing any file edits!
```

---

## 9. Architecture Prompts

### 9.1 C4 Diagram & Component Decomposition
```text
Role: Principal Software Architect
Task: Generate a Mermaid C4 Container Diagram and Data Flow Diagram for adding [New Subsystem / Service].
Requirements: Show interaction between React SPA, FastAPI Router, DB, and External APIs.
```

---

## 10. UI Development Prompts

### 10.1 TipTap Editor Extension Prompt
```text
Role: Senior Frontend Developer (ProseMirror / TipTap Expert)
Task: Extend `ApplicationEditor.tsx` to add an inline AI Bullet Polish action bar.
UI Spec:
- Dark glass floating toolbar over selected text.
- "Polish with AI" button with a spinning loader state.
- Modal displaying 3 selectable metric-driven variations fetched from `POST /api/v1/applications/regenerate-bullet`.
```

---

## 11. Backend Development Prompts

### 11.1 FastAPI Endpoint Creator
```text
Role: Senior Backend Engineer (FastAPI & Python 3.13)
Task: Create a new endpoint `[METHOD] /api/v1/[path]` in `backend/app/routers/[router_name].py`.
Requirements:
1. Validate input using a new Pydantic schema in `schemas.py`.
2. Extract user identity using `current_user: User = Depends(get_current_user)`.
3. Filter DB operations strictly by `user_id == current_user.id`.
4. Include clear exception handling with proper HTTP status codes.
```

---

## 12. Database Development Prompts

### 12.1 SQLAlchemy Model & JSON Column Schema Prompt
```text
Role: Database Architect
Task: Add a new model / field to `backend/app/models.py`.
Requirements:
- Define SQLAlchemy 2.0 column types explicitly.
- For JSON fields, document the expected dictionary structure in code comments.
- Update `backend/app/schemas.py` with corresponding Pydantic response and update models.
```

---

## 13. API Development Prompts

### 13.1 REST API Endpoint Expansion
```text
Role: Backend API Specialist
Task: Add `GET /api/v1/auth/config` to expose public SSO configuration parameters.
Logic: Return `{ "google_client_id": settings.GOOGLE_CLIENT_ID or None }` without exposing client secrets.
```

---

## 14. AI Feature Prompts

### 14.1 Job Description Parsing Prompt (`gpt-5.4-nano`)
```text
Role: AI Prompt Engineer
Task: Create the prompt template in `backend/app/ai/prompts.py` for parsing raw Job Descriptions.
System Prompt: "You are an expert ATS recruitment parser. Analyze the job description and output JSON with keys: job_title, company, responsibilities, required_skills, preferred_skills, keywords, experience_level, soft_skills."
Model Constraint: Enforce `response_format={"type": "json_object"}`.
```

### 14.2 Resume Tailoring & ATS Evaluation Prompt (`gpt-5.4-mini`)
```text
Role: Lead AI Architect
Task: Create the prompt template for matching a candidate Master Profile to a Job Description.
Requirements:
- Calculate ATS compliance, job match, content quality, and writing quality (0-100).
- Categorize missing keywords into: critical, recommended, and contextual.
- Generate bullet rewrites incorporating action verbs and quantifiable impact.
```

---

## 15. Testing Prompts

### 15.1 Pytest Endpoint Integration Test Generator
```text
Role: QA Automation Engineer
Task: Add automated integration tests in `backend/tests/test_main.py` for `POST /api/v1/auth/google`.
Requirements:
- Mock `httpx.AsyncClient.get` using `unittest.mock.patch` and `MagicMock` for synchronous `.json()` returns.
- Test both successful authentication and invalid token scenarios.
```

---

## 16. Debugging Prompts

### 16.1 Traceback Root-Cause Analysis
```text
Role: Lead Debugging Engineer
Task: Investigate the following failure traceback from pytest/uvicorn:
[PASTE TRACEBACK HERE]
Instructions:
1. Locate the exact file and line number causing the crash.
2. Explain why the failure occurred (e.g. coroutine unawaited, null reference, key error).
3. Provide the precise drop-in fix without modifying unrelated logic.
```

---

## 17. Refactoring Prompts

### 17.1 Code Optimization & Type Hardening
```text
Role: Principal Staff Engineer
Task: Refactor `[file_path]` to improve readability and type safety.
Rules:
- Eliminate `any` types in TypeScript.
- Replace manual dictionary access with typed Pydantic models in Python.
- Preserve all existing functionality and docstrings.
```

---

## 18. Documentation Prompts

### 18.1 Technical Spec Generator
```text
Role: Lead Technical Writer
Task: Generate a markdown document for [Document Name, e.g. PRD / SAD].
Requirements: Include Cover Page, Revision History, System Architecture Diagrams, API Endpoint Tables, and Acceptance Criteria.
```

---

## 19. Deployment Prompts

### 19.1 Docker & Cloud Deployment Scaffolding
```text
Role: DevOps & Infrastructure Engineer
Task: Create a multi-stage `Dockerfile` and `docker-compose.yml` for TailorCV.
Components:
- FastAPI Uvicorn backend with Playwright Chromium dependencies installed.
- Vite React SPA static asset builder.
```

---

## 20. Recovery & Failure Prompts

### 20.1 API Rate-Limit Fallback Handler
```text
Role: Resilience Engineer
Task: Implement a graceful fallback in `backend/app/ai/client.py` when OpenAI returns a rate-limit (HTTP 429) or connection timeout.
Logic: Fall back to local keyword token matching for ATS scoring and inform the user via a friendly notification badge.
```

---

## 21. Prompt Iteration Log

| Iteration | Target Feature | Problem Identified | Fix Applied | Result |
| :--- | :--- | :--- | :--- | :--- |
| **v1.0** | JD Parsing | OpenAI returned markdown-formatted JSON (```json...) breaking Pydantic | Added `response_format={"type": "json_object"}` | 100% valid JSON parse rate |
| **v1.1** | Google Auth Tests | `AsyncMock` on `httpx` returned coroutine for `.json()` causing `AttributeError` | Set `mock_response.json = MagicMock(return_value=...)` | All unit tests passed cleanly |

---

## 22. Prompt Best Practices

* **DO**: Provide exact file paths and line ranges when referring to source code.
* **DO**: Ask the AI to write tests before declaring work completed.
* **DON'T**: Allow the AI to return partial code snippets with missing functions.
* **DON'T**: Ignore explicit command failure exit codes.

---

## 23. Lessons Learned

1. **Explicit Return Types**: AI assistants generate drastically better code when response types are defined upfront in Pydantic/TypeScript.
2. **Mock Synchronous Methods Correctly**: When mocking HTTP response objects in Python async tests, `response.json()` is a synchronous method and must be mocked with `MagicMock`, not `AsyncMock`.

---

## 24. Appendix — Reusable Prompt Templates

### Template A: Quick Bug Fix Prompt
```text
I am seeing the following error in TailorCV:
[PASTE LOG / SCREENSHOT SUMMARY HERE]

Please:
1. Inspect the source file [file_path].
2. Identify the root cause.
3. Fix the issue and verify using pytest or npm run build.
```

### Template B: New API Route Prompt
```text
Please implement a new route in `backend/app/routers/[router].py`:
- Method: [GET/POST/PUT/DELETE]
- Path: `/api/v1/[path]`
- Pydantic Input Schema: [SchemaName]
- Auth Required: Yes (JWT Bearer)
```
