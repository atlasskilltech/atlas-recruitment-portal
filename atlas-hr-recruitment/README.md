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
cd atlas-hr-recruitment
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
