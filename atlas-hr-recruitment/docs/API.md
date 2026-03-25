# Atlas HR Recruitment Portal - API Documentation

Base URL: `/api` (all endpoints require authentication)

---

## Dashboard Stats

### `GET /api/dashboard-stats`

Returns aggregated statistics for the dashboard.

**Response:**

```json
{
  "success": true,
  "stats": {
    "total_applicants": 150,
    "new_applicants": 23,
    "ai_eligible": 80,
    "ai_rejected": 30,
    "ai_hold": 15,
    "interview_pending": 10,
    "interview_passed": 40,
    "interview_failed": 12,
    "interview_evaluated": 25,
    "shortlisted": 35,
    "scheduled": 20,
    "selected": 10,
    "offer_released": 8,
    "hired": 5,
    "rejected": 15
  }
}
```

---

## Candidates

### `GET /api/candidates`

Returns a paginated list of candidates with optional filtering and sorting.

**Query Parameters:**

| Parameter             | Type   | Description                          |
|-----------------------|--------|--------------------------------------|
| `page`                | number | Page number (default: 1)             |
| `limit`               | number | Items per page (default: 20, max: 100) |
| `search`              | string | Search by name                       |
| `name`                | string | Filter by candidate name             |
| `email`               | string | Filter by email                      |
| `job_id`              | string | Filter by job ID                     |
| `hr_status`           | string | Filter by HR status                  |
| `ai_status`           | string | Filter by AI screening status        |
| `date_from`           | string | Filter from date (YYYY-MM-DD)        |
| `date_to`             | string | Filter to date (YYYY-MM-DD)          |
| `match_score_min`     | number | Minimum AI match score (0-100)       |
| `match_score_max`     | number | Maximum AI match score (0-100)       |
| `interview_score_min` | number | Minimum interview score (0-100)      |
| `interview_score_max` | number | Maximum interview score (0-100)      |
| `sort_by`             | string | Field to sort by                     |
| `sort_order`          | string | Sort direction: `ASC` or `DESC`      |

**Response:**

```json
{
  "success": true,
  "data": [ /* candidate objects */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### `GET /api/candidates/:id`

Returns details for a single candidate.

**Path Parameters:**

| Parameter | Type   | Description  |
|-----------|--------|--------------|
| `id`      | number | Candidate ID |

**Response (200):**

```json
{
  "success": true,
  "data": { /* candidate object */ }
}
```

**Error Responses:**

- `400` – Invalid candidate ID
- `404` – Candidate not found

---

## Chart Data

### `GET /api/chart-data`

Returns datasets for dashboard charts and visualizations.

**Response:**

```json
{
  "success": true,
  "charts": {
    "applicantsByRole": [
      { "label": "Software Engineer", "value": 45 }
    ],
    "matchScoreDist": [
      { "label": "90-100", "value": 12 }
    ],
    "interviewScoreDist": [
      { "label": "80-89", "value": 8 }
    ],
    "monthlyTrend": [
      { "label": "2026-01", "value": 30 }
    ],
    "statusFunnel": [
      { "label": "Total Applicants", "value": 150 },
      { "label": "AI Eligible", "value": 80 },
      { "label": "Interview Passed", "value": 40 },
      { "label": "Shortlisted", "value": 35 },
      { "label": "Scheduled", "value": 20 },
      { "label": "Hired", "value": 5 }
    ]
  }
}
```

---

## Search

### `GET /api/search`

Quick search for candidates (supports autocomplete / live search).

**Query Parameters:**

| Parameter | Type   | Description                                  |
|-----------|--------|----------------------------------------------|
| `q`       | string | Search query (minimum 2 characters required) |

Searches across: name, email, mobile number, and application ID.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "appln_id": "ATL-2026-001",
      "appln_full_name": "John Doe",
      "appln_email": "john@example.com",
      "appln_mobile_no": "+919876543210",
      "appln_status_new": "shortlisted",
      "job_title": "Software Engineer"
    }
  ]
}
```

Returns an empty array if the query is fewer than 2 characters. Results are limited to 20 matches.

---

## Reports

### `GET /api/reports`

Returns aggregated report data.

**Response:**

```json
{
  "success": true,
  "reports": {
    "overview": {
      "total_candidates": 150,
      "new_last_30_days": 23,
      "new_last_7_days": 8
    },
    "hrStatusBreakdown": [
      { "status": "new", "count": 50 }
    ],
    "screeningSummary": {
      "total_screened": 120,
      "avg_match_score": 68.5,
      "min_match_score": 15,
      "max_match_score": 98,
      "eligible_count": 80,
      "rejected_count": 30,
      "hold_count": 10
    },
    "interviewSummary": {
      "total_interviewed": 60,
      "avg_interview_score": 72.3,
      "min_interview_score": 20,
      "max_interview_score": 95,
      "passed_count": 40,
      "failed_count": 12,
      "evaluated_count": 8
    },
    "topJobRoles": [
      { "job_title": "Software Engineer", "application_count": 45 }
    ],
    "monthlyHiring": [
      { "month": "2026-01", "applications": 30, "hires": 3 }
    ]
  }
}
```

---

## Authentication

### `POST /login`

Authenticate a user session.

**Body Parameters:**

| Parameter  | Type   | Description |
|------------|--------|-------------|
| `email`    | string | User email  |
| `password` | string | Password    |

### `POST /logout`

End the current user session. Requires authentication.

---

## Candidates (Web)

All routes below require authentication and are mounted at `/candidates`.

| Method | Path                          | Description                         |
|--------|-------------------------------|-------------------------------------|
| GET    | `/candidates`                 | List all candidates                 |
| GET    | `/candidates/export`          | Export candidate list                |
| GET    | `/candidates/:id`             | Show candidate detail               |
| POST   | `/candidates/:id/run-ai-match`| Run AI match for a single candidate |
| POST   | `/candidates/bulk/run-ai-match`| Run AI match for multiple candidates|
| POST   | `/candidates/:id/add-note`    | Add a note to a candidate           |

---

## AI Screening & Interviews

All routes below require authentication and are mounted at `/ai`.

### Screening

| Method | Path                            | Description                  |
|--------|---------------------------------|------------------------------|
| GET    | `/ai/screening`                 | List all AI screenings       |
| GET    | `/ai/screening/:id`             | View screening detail        |
| POST   | `/ai/screening/:candidateId/run`| Run AI screening match       |
| POST   | `/ai/screening/bulk-run`        | Bulk run AI screening        |
| POST   | `/ai/screening/:id/retry`       | Retry a failed screening     |

### Interviews (Admin)

| Method | Path                                  | Description            |
|--------|---------------------------------------|------------------------|
| GET    | `/ai/interviews`                      | List all AI interviews |
| GET    | `/ai/interviews/:id`                  | View interview detail  |
| POST   | `/ai/interviews/:candidateId/invite`  | Invite candidate       |

### Interviews (Public - No Auth Required)

These are candidate-facing endpoints accessed via a unique token link.

| Method | Path                            | Description              |
|--------|---------------------------------|--------------------------|
| GET    | `/ai/interview/:token`          | Show interview page      |
| POST   | `/ai/interview/:token/start`    | Start the interview      |
| POST   | `/ai/interview/:token/answer`   | Submit an answer         |
| POST   | `/ai/interview/:token/submit`   | Complete the interview   |

---

## Shortlist Management

All routes require authentication and are mounted at `/shortlist`.

| Method | Path                              | Description                |
|--------|-----------------------------------|----------------------------|
| GET    | `/shortlist`                      | View shortlisted candidates|
| POST   | `/shortlist/:candidateId/shortlist`| Add to shortlist          |
| POST   | `/shortlist/:candidateId/reject`  | Reject candidate           |
| POST   | `/shortlist/:candidateId/hold`    | Put candidate on hold      |
| POST   | `/shortlist/:candidateId/select`  | Select candidate           |
| POST   | `/shortlist/:candidateId/offer`   | Release offer              |
| POST   | `/shortlist/:candidateId/hired`   | Mark as hired              |

---

## Schedule Management

All routes require authentication and are mounted at `/schedules`.

| Method | Path                              | Description                        |
|--------|-----------------------------------|------------------------------------|
| GET    | `/schedules`                      | List all schedules                 |
| GET    | `/schedules/create/:candidateId`  | Show schedule creation form        |
| POST   | `/schedules`                      | Create a new schedule              |
| GET    | `/schedules/:id`                  | View schedule detail               |
| POST   | `/schedules/:id/reschedule`       | Reschedule an interview            |
| POST   | `/schedules/:id/cancel`           | Cancel a scheduled interview       |

---

## Reports (Web)

| Method | Path       | Description           |
|--------|------------|-----------------------|
| GET    | `/reports` | Show reports dashboard |

---

## Notifications

| Method | Path              | Description          |
|--------|-------------------|----------------------|
| GET    | `/notifications`  | List all notifications |

---

## Constants Reference

### HR Statuses

`new`, `shortlisted`, `rejected`, `hold`, `scheduled`, `selected`, `offer_released`, `hired`

### AI Screening Statuses

`eligible`, `hold`, `rejected`

### Interview Statuses

`pending`, `invited`, `in_progress`, `submitted`, `evaluated`, `passed`, `failed`, `expired`

### Recommendation Tags

`strong_fit` (score >= 75), `moderate_fit` (score 50-74.99), `weak_fit` (score < 50)

### User Roles

`super_admin`, `hr_manager`, `recruiter`, `interviewer`

### Pagination Defaults

- Default page: 1
- Default limit: 20
- Max limit: 100
