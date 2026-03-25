# Atlas HR Recruitment Portal - API Documentation

Base URL: `http://localhost:<PORT>`

All protected endpoints require an active session (cookie-based authentication).
Public endpoints are noted explicitly.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Dashboard](#dashboard)
3. [Candidates](#candidates)
4. [AI Screening (Stage 1)](#ai-screening-stage-1)
5. [AI Interviews (Stage 2) - Admin](#ai-interviews-stage-2---admin)
6. [AI Interviews - Candidate-Facing (Public)](#ai-interviews---candidate-facing-public)
7. [Shortlisting (Stage 3)](#shortlisting-stage-3)
8. [Interview Scheduling (Stage 4)](#interview-scheduling-stage-4)
9. [Reports & Analytics](#reports--analytics)
10. [Notifications](#notifications)
11. [JSON API Endpoints](#json-api-endpoints)
12. [Role-Based Access Control](#role-based-access-control)
13. [Business Rules](#business-rules)
14. [Error Responses](#error-responses)
15. [Security](#security)

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/login` | Guest | Login page |
| POST | `/login` | Guest | Authenticate user |
| POST | `/logout` | Required | Destroy session and logout |

### POST /login

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User email address |
| `password` | string | Yes | User password |

**Behavior:** On success, creates a session and redirects to `/dashboard` (or the originally requested URL). On failure, redirects back to `/login` with a flash error message.

**Rate Limiting:** 5 attempts per 15 minutes.

### POST /logout

Destroys the session, clears the `connect.sid` cookie, and redirects to `/login`.

---

## Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | Required | Main dashboard with stats, charts, recent applicants |

Renders the dashboard view with recruitment statistics and visualizations.

---

## Candidates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/candidates` | Required | Paginated candidate list with filters |
| GET | `/candidates/export` | Required | Export filtered list (query: `format=csv\|json`) |
| GET | `/candidates/:id` | Required | Full candidate detail page (10 tabs) |
| POST | `/candidates/:id/run-ai-match` | Required | Run AI screening match for single candidate |
| POST | `/candidates/bulk/run-ai-match` | Required | Run AI match for selected candidates |
| POST | `/candidates/:id/add-note` | Required | Add HR note to a candidate |

### GET /candidates - Query Parameters

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

### POST /candidates/bulk/run-ai-match

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `candidate_ids[]` | int[] | Yes | Array of candidate IDs to process |

### POST /candidates/:id/add-note

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `note_text` | string | Yes | Note content |
| `note_type` | string | Yes | Type of note |

---

## AI Screening (Stage 1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai/screening` | Required | List all AI screening results |
| GET | `/ai/screening/:id` | Required | Screening detail (scores, skills, gaps) |
| POST | `/ai/screening/:candidateId/run` | Required | Run AI match for a candidate |
| POST | `/ai/screening/bulk-run` | Required | Bulk run AI match |
| POST | `/ai/screening/:id/retry` | Required | Retry a failed screening |

### POST /ai/screening/bulk-run

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `candidate_ids[]` | int[] | Yes | Array of candidate IDs to screen |

---

## AI Interviews (Stage 2) - Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai/interviews` | Required | List all AI interviews |
| GET | `/ai/interviews/:id` | Required | Interview detail (questions, answers, scores) |
| POST | `/ai/interviews/:candidateId/invite` | Required | Create interview invitation |

### POST /ai/interviews/:candidateId/invite

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `candidate_id` | int | Yes | Candidate ID |
| `interview_type` | string | Yes | Type of AI interview |

---

## AI Interviews - Candidate-Facing (Public)

These endpoints are accessed by candidates via a unique JWT token link. **No login required.**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai/interview/:token` | Token | Interview page with instructions and questions |
| POST | `/ai/interview/:token/start` | Token | Mark interview as started |
| POST | `/ai/interview/:token/answer` | Token | Submit answer to a question |
| POST | `/ai/interview/:token/submit` | Token | Complete and evaluate interview |

### POST /ai/interview/:token/start

**Response (JSON):**
```json
{
  "success": true,
  "message": "Interview started."
}
```

### POST /ai/interview/:token/answer

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question_id` | int | Yes | ID of the question being answered |
| `answer_text` | string | Yes | Candidate's answer text |

**Response (JSON):**
```json
{
  "success": true,
  "message": "Answer submitted."
}
```

### POST /ai/interview/:token/submit

**Response (JSON):**
```json
{
  "success": true,
  "message": "Interview completed and evaluated successfully.",
  "overall_score": 72.5,
  "recommendation": "moderate_fit",
  "summary": "..."
}
```

---

## Shortlisting (Stage 3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shortlist` | Required | List shortlisted candidates |
| POST | `/shortlist/:candidateId/shortlist` | Required | Shortlist a candidate |
| POST | `/shortlist/:candidateId/reject` | Required | Reject a candidate |
| POST | `/shortlist/:candidateId/hold` | Required | Put candidate on hold |
| POST | `/shortlist/:candidateId/select` | Required | Mark candidate as selected |
| POST | `/shortlist/:candidateId/offer` | Required | Release offer to candidate |
| POST | `/shortlist/:candidateId/hired` | Required | Mark candidate as hired |

---

## Interview Scheduling (Stage 4)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/schedules` | Required | List all scheduled interviews |
| GET | `/schedules/create/:candidateId` | Required | Schedule interview form |
| POST | `/schedules` | Required | Create a new schedule |
| GET | `/schedules/:id` | Required | Schedule detail |
| POST | `/schedules/:id/reschedule` | Required | Reschedule interview |
| POST | `/schedules/:id/cancel` | Required | Cancel scheduled interview |

### POST /schedules - Create Schedule

**Request Body:**

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

---

## Reports & Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports` | Required | Reports dashboard with charts |

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Required | Notification log list |

---

## JSON API Endpoints

All JSON API endpoints are prefixed with `/api/` and require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard-stats` | Dashboard statistics |
| GET | `/api/candidates` | Candidate list (paginated) |
| GET | `/api/candidates/:id` | Candidate detail |
| GET | `/api/chart-data` | Chart datasets for dashboard |
| GET | `/api/search` | Quick search candidates (query: `q`, min 2 chars) |
| GET | `/api/reports` | Aggregated report data |

### GET /api/dashboard-stats

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_applicants": 500,
    "new_applicants": 45,
    "ai_eligible": 120,
    "ai_rejected": 80,
    "ai_hold": 15,
    "interview_pending": 30,
    "interview_passed": 25,
    "interview_failed": 10,
    "interview_evaluated": 20,
    "shortlisted": 18,
    "scheduled": 10,
    "selected": 8,
    "offer_released": 6,
    "hired": 5,
    "rejected": 60
  }
}
```

### GET /api/candidates

Accepts the same query parameters as `GET /candidates` (see [Candidates](#candidates)).

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /api/candidates/:id

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error (invalid ID):** `400 { "success": false, "message": "Invalid candidate ID." }`

**Error (not found):** `404 { "success": false, "message": "Candidate not found." }`

### GET /api/chart-data

**Response:**
```json
{
  "success": true,
  "charts": {
    "applicantsByRole": [{ "label": "Professor", "value": 50 }],
    "matchScoreDist": [{ "label": "70-79", "value": 30 }],
    "interviewScoreDist": [{ "label": "80-89", "value": 15 }],
    "monthlyTrend": [{ "label": "2025-01", "value": 42 }],
    "statusFunnel": [
      { "label": "Total Applicants", "value": 500 },
      { "label": "AI Eligible", "value": 120 },
      { "label": "Interview Passed", "value": 25 },
      { "label": "Shortlisted", "value": 18 },
      { "label": "Scheduled", "value": 10 },
      { "label": "Hired", "value": 5 }
    ]
  }
}
```

### GET /api/search

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (minimum 2 characters) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "appln_id": "ATL-2024-001",
      "appln_full_name": "John Doe",
      "appln_email": "john@example.com",
      "appln_mobile_no": "9876543210",
      "appln_status_new": "shortlisted",
      "job_title": "Assistant Professor"
    }
  ]
}
```

### GET /api/reports

**Response:**
```json
{
  "success": true,
  "reports": {
    "overview": {
      "total_candidates": 500,
      "new_last_30_days": 45,
      "new_last_7_days": 12
    },
    "hrStatusBreakdown": [
      { "status": "new", "count": 200 },
      { "status": "shortlisted", "count": 18 }
    ],
    "screeningSummary": {
      "total_screened": 300,
      "avg_match_score": 62.5,
      "min_match_score": 12.0,
      "max_match_score": 98.0,
      "eligible_count": 120,
      "rejected_count": 80,
      "hold_count": 100
    },
    "interviewSummary": {
      "total_interviewed": 100,
      "avg_interview_score": 65.0,
      "min_interview_score": 20.0,
      "max_interview_score": 95.0,
      "passed_count": 60,
      "failed_count": 30,
      "evaluated_count": 10
    },
    "topJobRoles": [
      { "job_title": "Assistant Professor", "application_count": 80 }
    ],
    "monthlyHiring": [
      { "month": "2025-01", "applications": 42, "hires": 3 }
    ]
  }
}
```

---

## Role-Based Access Control

| Role | Access Level |
|------|-------------|
| `super_admin` | Full access to all modules |
| `hr_manager` | Full access to all modules |
| `recruiter` | Candidates, AI Screening, AI Interviews, Shortlist, Schedules |
| `interviewer` | View candidates, AI interview results (limited) |

---

## Business Rules

### AI Match Scoring

| Score Range | Tag | Action |
|-------------|-----|--------|
| >= 75 | `strong_fit` | Eligible for AI Interview |
| 50 - 74.99 | `moderate_fit` | Eligible for AI Interview |
| < 50 | `weak_fit` | Hold or Reject |

### AI Interview Scoring (Weighted)

| Category | Weight |
|----------|--------|
| Communication | 20% |
| Domain Knowledge | 30% |
| Problem Solving | 30% |
| Confidence/Clarity | 20% |

### Interview Pass/Fail

- Score >= 50: Move to HR dashboard
- Score < 50: Reject or keep in talent pool

### Final Recommendation Formula

**40%** AI Match Score + **40%** AI Interview Score + **20%** HR Manual Review

---

## Error Responses

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

---

## Security

- **Helmet** -- HTTP security headers
- **Rate Limiting** -- 5 attempts per 15 min on `/login`
- **Parameterized Queries** -- All SQL uses `?` placeholders via mysql2
- **JWT Tokens** -- Signed interview invitation links (configurable expiry)
- **Session Auth** -- express-session with configurable store
- **Input Validation** -- express-validator on all form submissions
- **XSS Prevention** -- EJS auto-escaping + sanitizeHtml utility
