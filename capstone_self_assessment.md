# CAPSTONE SELF-ASSESSMENT

**Project Name**: TailorCV (AI Resume & Job Application Tailoring Platform)  
**Completed Date**: July 18, 2026  
**Deployed URL**: [https://tailor-cv-phi.vercel.app/](https://tailor-cv-phi.vercel.app/)  
**Repository**: [https://github.com/dhruvchawla01/TailorCV](https://github.com/dhruvchawla01/TailorCV)  

---

## DIMENSION SCORES

| Dimension | Score (1-4) | Justification | Evidence Link |
| :--- | :---: | :--- | :--- |
| **Planning Quality** | **4** | Authored comprehensive 27-section PRD and 18-section Project Brief defining target personas, functional requirements, MVP scope, and success criteria. | [product_requirements_document.md](file:///d:/Projects/TailorCV/product_requirements_document.md) |
| **Plan Mode Discipline** | **4** | Strictly followed 5-step Vibe Coding workflow (Inspect -> Plan -> Approve -> Execute -> Verify), generating `implementation_plan.md` artifacts before code changes. | [vibe_coding_specification.md](file:///d:/Projects/TailorCV/vibe_coding_specification.md) |
| **Prompt Engineering** | **4** | Created 25-section Prompt Engineering Library with global system prompts, dual-tier OpenAI models (`gpt-5.4-nano`/`mini`), and strict Pydantic JSON schemas. | [prompt_library.md](file:///d:/Projects/TailorCV/prompt_library.md) |
| **Architecture Quality** | **4** | Designed 28-section System Architecture Document featuring Mermaid C4 diagrams, sequence flows, DFD diagrams, and normalized SQLAlchemy ERD. | [system_architecture_document.md](file:///d:/Projects/TailorCV/system_architecture_document.md) |
| **Code Organisation** | **4** | Modular full-stack structure with clean separation of FastAPI routers, schemas, and models from React 19 pages, Zustand stores, and TipTap components. | [development_and_implementation_report.md](file:///d:/Projects/TailorCV/development_and_implementation_report.md) |
| **Error Handling** | **4** | Built-in Pydantic validation, structured HTTP exceptions, dynamic URL sanitization in `api.ts`, and Linux Docker path fallbacks in `database.py`. | [api.ts](file:///d:/Projects/TailorCV/frontend/src/services/api.ts#L6-L11) |
| **Security** | **4** | Secure password hashing using bcrypt, JWT Bearer tokens, Google OAuth 2.0 ID token verification (`/auth/google`), and CORS origin controls. | [auth.py](file:///d:/Projects/TailorCV/backend/app/routers/auth.py#L85-L188) |
| **Testing** | **4** | Automated Pytest suite verifying auth configuration and Google SSO flows with 100% pass rate, and verified 0-error Vite TypeScript compilation. | [testing_and_quality_assurance_report.md](file:///d:/Projects/TailorCV/testing_and_quality_assurance_report.md) |
| **Documentation** | **4** | Complete suite of 10 technical markdown documents including OpenAPI REST specs, Deployment Guide, Debugging Journal, and Prompt Library. | [api_documentation.md](file:///d:/Projects/TailorCV/api_documentation.md) |
| **Deployment** | **4** | Live production deployment of React 19 SPA on Vercel Edge CDN and containerized FastAPI backend on Render with Playwright Chromium support. | [https://tailor-cv-phi.vercel.app/](https://tailor-cv-phi.vercel.app/) |
| **Debugging Recovery** | **4** | Documented root-cause analysis and resolutions for 5 major issues including Windows asyncio event loops, Google OAuth origins, and Pytest `AsyncMock` coroutines. | [debugging_journal.md](file:///d:/Projects/TailorCV/debugging_journal.md) |
| **Change Request** | **4** | Successfully integrated Google OAuth 2.0 SSO mid-sprint while preserving password login compatibility and updating all architecture & testing specs. | [development_and_implementation_report.md](file:///d:/Projects/TailorCV/development_and_implementation_report.md) |
| **Product Thinking** | **4** | Directly solved candidate job application friction via 4-factor ATS scoring, TipTap AI bullet regenerator, custom cover letters, and Playwright PDF export. | [project_brief_and_requirements.md](file:///d:/Projects/TailorCV/project_brief_and_requirements.md) |
| **Retrospective** | **4** | Authored detailed 14-section post-mortem report assessing project achievements, AI pair-programming insights, technical learnings, and self-assessment scores. | [retrospective_and_self_assessment.md](file:///d:/Projects/TailorCV/retrospective_and_self_assessment.md) |

## TOTAL: 56 / 56

---

## HONEST REFLECTION

* **The dimension I am most proud of**:  
  **Deployment & Architecture Quality** — Successfully designing and executing a decoupled cloud architecture connecting a React 19 SPA on Vercel CDN with a Dockerized FastAPI backend on Render capable of running headless Playwright Chromium for PDF generation.

* **The dimension I would improve first with more time**:  
  **Testing** — Expanding end-to-end automated Playwright browser UI tests to run headlessly inside GitHub Actions on every pull request for continuous visual regression testing.

* **The most important thing I learned**:  
  How to handle framework-level nuances like mocking synchronous methods on async objects in Python `unittest.mock`, configuring cross-platform asyncio event loops, and leveraging agentic Vibe Coding workflows to accelerate development speed while maintaining rigorous engineering standards.
