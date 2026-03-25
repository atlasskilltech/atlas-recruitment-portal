# Atlas HR Recruitment Portal

AI-Powered Applicant Tracking System & Screening Platform for Atlas University HR.

## Tech Stack

- **Backend:** Node.js (Express.js)
- **Views:** EJS with express-ejs-layouts
- **Database:** MySQL (mysql2)
- **Styling:** Tailwind CSS
- **Charts:** ApexCharts
- **Auth:** Session-based (express-session)
- **AI Layer:** Abstracted service supporting OpenAI / Azure / OpenRouter / Mock

## Architecture

```
MVC + Service Layer + Repository Pattern

src/
├── config/         # DB, env, session, constants
├── controllers/    # Request handlers
├── routes/         # Express routers
├── services/       # Business logic + AI services
├── repositories/   # Data access layer (MySQL queries)
├── middlewares/     # Auth, role, error, validation
├── validations/    # express-validator rule sets
├── utils/          # Helpers, logger, export, date, prompts
├── views/          # EJS templates (layouts, partials, pages)
└── public/         # Static assets (CSS, JS, images)
```

## Setup

### Prerequisites

- Node.js >= 18
- MySQL >= 8.0

### Installation

```bash
cd atlas-recruitment-portal
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your database credentials and settings
```

### Database Setup

```bash
# Run migrations (creates all atlas_rec_* tables)
npm run db:migrate

# Seed default users
npm run db:seed
```

### Build CSS

```bash
# One-time build
npm run css:build

# Watch mode (development)
npm run css:watch
```

### Run

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

### Default Login

| Email | Password | Role |
|-------|----------|------|
| admin@atlasuniversity.edu.in | Atlas@2024 | Super Admin |
| hr@atlasuniversity.edu.in | Atlas@2024 | HR Manager |
| recruiter@atlasuniversity.edu.in | Atlas@2024 | Recruiter |

## Existing Database Tables (Read-Only)

- `dice_staff_recruitment` — Applicant data
- `isdi_admsn_applied_for` — Job descriptions

These tables are **read-only**. The system joins them with new `atlas_rec_*` tables for AI screening, interviews, shortlisting, and scheduling.

## New Tables (prefix: atlas_rec_)

1. `atlas_rec_users` — Portal users
2. `atlas_rec_candidate_ai_screening` — AI match results
3. `atlas_rec_ai_interviews` — AI interview sessions
4. `atlas_rec_ai_interview_questions` — Generated questions
5. `atlas_rec_ai_interview_answers` — Candidate responses
6. `atlas_rec_hr_shortlists` — HR shortlist decisions
7. `atlas_rec_interview_schedules` — Physical interview schedules
8. `atlas_rec_hr_notes` — Internal HR notes
9. `atlas_rec_notifications` — Notification log
10. `atlas_rec_activity_logs` — Audit trail
11. `atlas_rec_status_history` — Status change history

## Recruitment Workflow (4 Stages)

1. **CV + JD AI Matching** — Heuristic/AI scoring of candidate vs job fit
2. **AI Interview Screening** — Auto-generated questions, text responses, auto-evaluation
3. **HR Dashboard + Notifications** — Shortlisting, notes, recommendations
4. **Physical Interview Scheduling** — Schedule, notify, track decisions

## AI Integration

The AI layer uses an abstract provider pattern (`src/services/ai/aiProvider.service.js`):

- **Mock Provider** (default): Deterministic heuristic scoring — fully functional without API keys
- **OpenAI Provider**: Set `AI_PROVIDER=openai` and `AI_API_KEY`
- **Azure Provider**: Set `AI_PROVIDER=azure` with Azure endpoint config
- **OpenRouter Provider**: Set `AI_PROVIDER=openrouter` with OpenRouter key

### Switching to Real AI

1. Set `AI_PROVIDER=openai` (or azure/openrouter) in `.env`
2. Set `AI_API_KEY` with your API key
3. Restart the server — the service layer automatically routes to the real provider

## File Access

Candidate uploaded files are accessed from the existing server:
```
https://www.atlasuniversity.edu.in/careers/uploads/{filename}
```

Configure via `UPLOAD_BASE_URL` in `.env`.

## Scoring Rules

| Score Range | AI Match Tag | Interview Recommendation |
|-------------|-------------|------------------------|
| >= 75 | Strong Fit | Strong Recommendation |
| 50 - 74.99 | Moderate Fit | Moderate Recommendation |
| < 50 | Weak Fit | Reject / Talent Pool |

**Final Recommendation:** 40% AI Match + 40% Interview + 20% HR Manual Review

## API Documentation

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/login` | Guest | Login page |
| POST | `/login` | Guest | Authenticate user (email, password) |
| POST | `/logout` | Required | Destroy session and logout |

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | Required | Main dashboard with stats, charts, recent applicants |

### Candidates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/candidates` | Required | Paginated candidate list with filters |
| GET | `/candidates/export` | Required | Export filtered list (query: `format=csv\|json`) |
| GET | `/candidates/:id` | Required | Full candidate detail page (10 tabs) |
| POST | `/candidates/:id/run-ai-match` | Required | Run AI screening match for single candidate |
| POST | `/candidates/bulk/run-ai-match` | Required | Run AI match for selected candidates (body: `candidate_ids[]`) |
| POST | `/candidates/:id/add-note` | Required | Add HR note (body: `note_text`, `note_type`) |

**Candidate List Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name, email, or mobile |
| `job_id` | int | Filter by job ID |
| `ai_status` | string | `eligible`, `hold`, `rejected` |
| `hr_status` | string | `new`, `shortlisted`, `rejected`, `hold`, `scheduled`, `selected`, `offer_released`, `hired` |
| `match_score_min` | float | Minimum AI match score (0-100) |
| `match_score_max` | float | Maximum AI match score (0-100) |
| `interview_score_min` | float | Minimum interview score (0-100) |
| `interview_score_max` | float | Maximum interview score (0-100) |
| `qualification` | string | Filter by qualification (`PhD`, `PG`, `UG`) |
| `experience_min` | float | Minimum years of experience |
| `experience_max` | float | Maximum years of experience |
| `location` | string | Filter by job location |
| `date_from` | date | Application date from (YYYY-MM-DD) |
| `date_to` | date | Application date to (YYYY-MM-DD) |
| `sort_by` | string | Sort column: `name`, `email`, `date`, `experience`, `match_score`, `interview_score`, `status` |
| `sort_order` | string | `ASC` or `DESC` |
| `page` | int | Page number (default: 1) |
| `limit` | int | Results per page (default: 20, max: 100) |

### AI Screening (Stage 1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai/screening` | Required | List all AI screening results |
| GET | `/ai/screening/:id` | Required | Screening detail (scores, skills, gaps) |
| POST | `/ai/screening/:candidateId/run` | Required | Run AI match for a candidate |
| POST | `/ai/screening/bulk-run` | Required | Bulk run AI match (body: `candidate_ids[]`) |
| POST | `/ai/screening/:id/retry` | Required | Retry failed screening |

### AI Interviews (Stage 2) - Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai/interviews` | Required | List all AI interviews |
| GET | `/ai/interviews/:id` | Required | Interview detail (questions, answers, scores) |
| POST | `/ai/interviews/:candidateId/invite` | Required | Create interview invitation (body: `candidate_id`, `interview_type`) |

### AI Interviews - Candidate-Facing (Public)

These endpoints are accessed by candidates via a unique JWT token link. No login required.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai/interview/:token` | Token | Interview page with instructions and questions |
| POST | `/ai/interview/:token/start` | Token | Mark interview as started (returns JSON) |
| POST | `/ai/interview/:token/answer` | Token | Submit answer (body: `question_id`, `answer_text`) (returns JSON) |
| POST | `/ai/interview/:token/submit` | Token | Complete and evaluate interview (returns JSON) |

**Interview Submit Response:**
```json
{
  "success": true,
  "message": "Interview completed and evaluated successfully.",
  "overall_score": 72.5,
  "recommendation": "moderate_fit",
  "summary": "..."
}
```

### Shortlisting (Stage 3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shortlist` | Required | List shortlisted candidates |
| POST | `/shortlist/:candidateId/shortlist` | Required | Shortlist a candidate |
| POST | `/shortlist/:candidateId/reject` | Required | Reject a candidate |
| POST | `/shortlist/:candidateId/hold` | Required | Put candidate on hold |
| POST | `/shortlist/:candidateId/select` | Required | Mark candidate as selected |
| POST | `/shortlist/:candidateId/offer` | Required | Release offer to candidate |
| POST | `/shortlist/:candidateId/hired` | Required | Mark candidate as hired |

### Interview Scheduling (Stage 4)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/schedules` | Required | List all scheduled interviews |
| GET | `/schedules/create/:candidateId` | Required | Schedule interview form |
| POST | `/schedules` | Required | Create schedule (body: see below) |
| GET | `/schedules/:id` | Required | Schedule detail |
| POST | `/schedules/:id/reschedule` | Required | Reschedule interview |
| POST | `/schedules/:id/cancel` | Required | Cancel scheduled interview |

**Create Schedule Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `candidate_id` | int | Yes | Candidate ID |
| `job_id` | int | No | Job ID |
| `scheduled_date` | date | Yes | Interview date (YYYY-MM-DD) |
| `scheduled_time` | time | Yes | Interview time (HH:MM) |
| `mode` | string | Yes | `offline` or `online` |
| `location` | string | If offline | Physical location |
| `meeting_link` | string | If online | Video meeting URL |
| `panel_members` | string | No | Comma-separated panel member names |
| `notes` | string | No | Additional notes |

### Reports & Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports` | Required | Reports dashboard with charts |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Required | Notification log list |

### JSON API Endpoints

All JSON API endpoints are prefixed with `/api/` and require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard-stats` | Dashboard statistics (JSON) |
| GET | `/api/candidates` | Candidate list (JSON) |
| GET | `/api/candidates/:id` | Candidate detail (JSON) |
| GET | `/api/chart-data` | Chart datasets for dashboard (JSON) |
| GET | `/api/search` | Quick search candidates (query: `q`, min 2 chars) |
| GET | `/api/reports` | Report data (JSON) |

**Dashboard Stats Response:**
```json
{
  "total_applicants": 500,
  "new_applicants": 45,
  "ai_eligible": 120,
  "ai_rejected": 80,
  "interview_pending": 30,
  "interview_passed": 25,
  "shortlisted": 18,
  "scheduled": 10,
  "hired": 5,
  "rejected": 60
}
```

### Role-Based Access Control

| Role | Access Level |
|------|-------------|
| `super_admin` | Full access to all modules |
| `hr_manager` | Full access to all modules |
| `recruiter` | Candidates, AI Screening, AI Interviews, Shortlist, Schedules |
| `interviewer` | View candidates, AI interview results (limited) |

### Business Rules

**AI Match Scoring:**
- Score >= 75: `strong_fit` — Eligible for AI Interview
- Score 50-74.99: `moderate_fit` — Eligible for AI Interview
- Score < 50: `weak_fit` — Hold or Reject

**AI Interview Scoring (Weighted):**
- Communication: 20%
- Domain Knowledge: 30%
- Problem Solving: 30%
- Confidence/Clarity: 20%

**Interview Pass/Fail:**
- Score >= 50: Move to HR dashboard
- Score < 50: Reject or keep in talent pool

**Final Recommendation Formula:**
- 40% AI Match Score + 40% AI Interview Score + 20% HR Manual Review

### Error Responses

All web routes return appropriate HTTP status codes with flash messages. API routes return JSON:

```json
{
  "success": false,
  "message": "Error description"
}
```

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 429 | Too many requests (rate limited) |
| 500 | Internal server error |

### Security

- **Helmet** — HTTP security headers
- **Rate Limiting** — 5 attempts per 15 min on `/login`
- **Parameterized Queries** — All SQL uses `?` placeholders via mysql2
- **JWT Tokens** — Signed interview invitation links (configurable expiry)
- **Session Auth** — express-session with configurable store
- **Input Validation** — express-validator on all form submissions
- **XSS Prevention** — EJS auto-escaping + sanitizeHtml utility
