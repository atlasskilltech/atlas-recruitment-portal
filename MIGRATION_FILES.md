# Migration Files - AI Recruitment Portal Changes

## Summary of Changes Made
This document lists all files modified during this session for migration to another project.
**Total modified files: 18** | **New files created: 1** | **Dependency files: 21+**

---

## 1. ROUTES (2 files)

### `src/routes/superAdmin.routes.js`
- Added admin routes for candidates, interviews listing, and interview detail:
  - `GET /admin/interviews` - All AI interviews taken (new page)
  - `GET /admin/interviews/:id` - AI interview detail (admin context)
  - `GET /admin/candidates/:id` - Candidate detail (admin context)
  - `POST /admin/candidates/:id/run-ai-match`
  - `POST /admin/candidates/:id/add-note`

### `src/routes/web.routes.js`
- Root `/` redirects to `/admin/jobs`

---

## 2. CONTROLLERS (3 files)

### `src/controllers/superAdmin.controller.js`
- **jobOpenings**: AI Resume Matched count with dual thresholds (50% applied, 90% non-applied)
- **jobDetail**: CV Match funnel with threshold-aware filtering
- **bulkInvite**: Always creates fresh interview (deletes ALL old ones first)
- **allInterviews** *(NEW)*: Lists all AI interviews with filters (search, role, status, date range), stats bar, card grid

### `src/controllers/candidates.controller.js`
- **show**: Added job match score query from `atlas_rec_job_candidate_matches`
- Admin context detection via `req.baseUrl` for error redirects

### `src/controllers/aiInterview.controller.js`
- **show**: Admin context detection for error redirect fallback

---

## 3. SERVICES (3 files)

### `src/services/jobMatching.service.js`
- **getTopMatches**: Non-applied candidates threshold changed to >= 90%
- Added JSDoc notes about threshold logic

### `src/services/interview.service.js`
- Interview lifecycle: create, start, submit answer, complete, evaluate
- JWT token generation for interview links
- AI evaluation with scoring

### `src/services/ai/interviewQuestionGenerator.service.js`
- **_resolveBankKey**: Job title checked FIRST (Professor -> academic bank)
- **_generateFromBank**: Mixed bank selection for question variety
- 3 question banks: academic (8), admin (6), technical (6)

---

## 4. VIEWS (6 files)

### `src/views/super-admin/jobs.ejs`
- Job listings card grid
- CV Match criteria info note (50%/90% thresholds from entire database)
- Filter bar (search, scope, job role with searchable dropdown)
- Stats bar (total positions, academics, admin, applicants)

### `src/views/super-admin/job-detail.ejs`
- Funnel stats (Applied → CV Match → AI Interview Taken → Result 75%+)
- View selector dropdown (Applied for Position / AI Matches from Entire Database) — no counts in labels
- CV Match criteria info note (same text as jobs page)
- Stage filtering with threshold-aware logic (50% applied, 90% non-applied)
- Candidate cards with Job Match score, qualification, email, interview score
- Bulk invite selection bar
- JD file link using `applied_job_desc_file` column with ERP URL prefix
- Shows ALL applicants (sorted by match score DESC), funnel stages handle filtering
- Links use `/admin/candidates/:id`
- End Interview button on interview session

### `src/views/super-admin/interviews.ejs` *(NEW FILE)*
- **Page**: All AI interviews taken at `/admin/interviews`
- **Filter bar**: Search (name/email), Job Role searchable dropdown, Status dropdown (Evaluated/Submitted/In Progress/Passed/Failed), Date From, Date To
- **Stats bar**: Total Interviews, Evaluated count, Score 75%+ count, Avg Score
- **Card grid**: Each card shows candidate name + avatar (color-coded by score), job role, status badge, 4 score columns (Total/Comm/Domain/Problem), Job Match score, qualification, email, interview date, fit badge
- Cards link to `/admin/interviews/:id`

### `src/views/candidates/detail.ejs`
- **Header**: Profile photo from `appln_profile`, Job Match score ring (SVG), Interview score ring (SVG)
- **Back button**: `javascript:history.back()`
- **Overview tab**: Fixed grid layout with overflow protection
- **AI Screening tab**: Removed AI Screening Score ring, shows extracted skills, keywords, education/experience summary, skill gap analysis (parsed JSON with colored badges)
- **AI Interview tab**: Inline SVG score rings for all 5 scores, safe JSON parsing for feedback
- **Documents tab**: Profile photo shown as image thumbnail

### `src/views/ai-interview/detail.ejs`
- **Hero card**: Candidate info + large overall score ring
- **4 score cards**: Communication, Domain Knowledge, Problem Solving, Confidence with mini progress bars
- **2-column layout**: AI Recommendation + Strengths/Improvements (conditional rendering)
- **Competency ratings**: Compact grid with inline bars
- **Q&A section**: Compact cards with inline answer/keyword score bars
- **Action buttons**: Shortlist, Schedule, Reject, Keep in Pool
- **Back button**: `javascript:history.back()`
- Handles malformed AI feedback JSON gracefully

### `src/views/ai-interview/take.ejs`
- **Setup screen**: Camera preview, permission handling
- **Session screen**: Full inline styles (no Tailwind dependency)
  - Left: Video with Rec badge, Mic status, live captions
  - Right: AI Interviewer, Question (no-select), Transcript, Answer (read-only)
  - Bottom: "Save & Next" / "Submit & Finish" (disabled until answered) + "End Interview" button (red, with confirmation)
  - Top: "HR Interview" title, timer, Live indicator
- **Completion screen**: "Interview Completed Successfully!" with HR follow-up message
- **Already Completed screen**: Same message for revisits, no score shown
- **Voice**: Preloaded voice selection (Google US English, Samantha for Mac, etc.)
- **Proctoring**:
  - Fullscreen on start, auto-re-request on exit
  - Tab switch detection with warning overlay + violation count
  - Copy/cut/paste/right-click blocked
  - Escape, Backspace, Ctrl+C/V/A/X, F12, PrintScreen blocked (capture phase)
  - Text selection disabled on questions
- **Mic**: Keepalive timer (5s), fresh SpeechRecognition on restart, onaudiostart reset, retry limits (20 error / 50 restart)
- **Layout**: `position:fixed;inset:0` for guaranteed full viewport on all screens (fullscreen + non-fullscreen), compact transcript/answer boxes with flex-shrink

---

## 5. MIDDLEWARE (1 file)

### `src/middlewares/auth.middleware.js`
- **isGuest**: Redirect changed from `/dashboard` to `/admin/jobs`

---

## 6. CSS (1 file)

### `src/public/css/atlas-theme.css`
- `.main-content`: Added `overflow-x: hidden` to prevent horizontal scroll
- `.searchable-select` component: Reusable searchable dropdown with input, dropdown panel, option items, filtering, and selected state styles

---

## 7. SIDEBAR & LAYOUT (2 files)

### `src/views/layouts/partials/sidebar.ejs`
- Added "AI Interview Taken" menu item with `mic` icon linking to `/admin/interviews`
- Menu items: Job Openings, AI Interview Taken

### `src/views/layouts/main.ejs`
- Added searchable dropdown JS component (auto-initializes all `.searchable-select` elements)
- Features: type-to-filter, click to select, click-outside to close, Escape to close, selected state highlighting

---

## 8. DATABASE TABLES USED

| Table | Column Notes | Purpose |
|-------|-------------|---------|
| `atlas_rec_job_candidate_matches` | `match_score`, `match_status`, `job_id`, `candidate_id` | Job-specific match scores (50%/90% thresholds) |
| `atlas_rec_candidate_ai_screening` | `ai_match_score`, `ai_status`, `extracted_skills`, `skill_gap_analysis` | AI screening results, extracted skills |
| `atlas_rec_ai_interviews` | `status` (NOT interview_status), `total_score`, `communication_score`, `domain_knowledge_score`, `problem_solving_score`, `confidence_score`, `started_at`, `evaluated_at` (NOT completed_at), `invitation_token` | Interview records with scores |
| `atlas_rec_ai_interview_questions` | `question_text`, `question_type`, `difficulty_level` | Generated interview questions |
| `atlas_rec_ai_interview_answers` | `answer_text`, `ai_score`, `keyword_relevance_score`, `ai_feedback` | Candidate answers with AI evaluation |
| `dice_staff_recruitment` | `appln_full_name`, `appln_email`, `appln_profile`, `appln_applied_for_sub` | Candidate applications/profiles |
| `isdi_admsn_applied_for` | `applied_for_post`, `applied_job_short_desc_new`, `applied_for_post_id` | Job openings/positions |
| `atlas_rec_activity_logs` | | Candidate activity logs |
| `atlas_rec_status_history` | | Candidate status history |

**Important column name notes:**
- `atlas_rec_ai_interviews.status` — NOT `interview_status` (the repository aliases it)
- `atlas_rec_ai_interviews.evaluated_at` — NOT `completed_at`
- `atlas_rec_ai_interviews.invitation_token` — NOT `interview_token`

---

## 9. DEPENDENCY FILES (not modified, but required)

| File | Purpose |
|------|---------|
| `src/services/fileUrl.service.js` | Builds file URLs for profile photos & documents |
| `src/repositories/candidate.repository.js` | Candidate DB queries (findById, etc.) |
| `src/repositories/interview.repository.js` | Interview CRUD operations |
| `src/repositories/job.repository.js` | Job DB queries |
| `src/repositories/screening.repository.js` | Screening DB queries |
| `src/repositories/note.repository.js` | HR notes CRUD |
| `src/services/ai/aiProvider.service.js` | AI provider abstraction (callAI) |
| `src/services/ai/interviewEvaluator.service.js` | Answer evaluation + summary |
| `src/services/ai/scoring.service.js` | Score calculation + recommendation |
| `src/services/notification.service.js` | Email notification sending |
| `src/services/candidate.service.js` | Candidate business logic |
| `src/utils/promptTemplates.js` | AI prompt templates |
| `src/utils/dateUtils.js` | Date formatting helpers |
| `src/utils/helpers.js` | General helpers (getInitials, etc.) |
| `src/config/db.js` | MySQL connection pool |
| `src/config/env.js` | Environment variables |
| `src/config/constants.js` | Constants (statuses, pagination) |
| `src/utils/logger.js` | Winston logger |
| `src/middlewares/error.middleware.js` | asyncHandler wrapper |
| `src/views/layouts/main.ejs` | Main layout (sidebar + topbar + content) |
| `src/views/layouts/partials/topbar.ejs` | Top navigation bar |
| `src/views/layouts/partials/footer.ejs` | Page footer |
| `src/views/layouts/partials/alerts.ejs` | Flash message alerts |
| `src/app.js` | Express app (fileUrlService, helpers, dateUtils in res.locals) |

---

## 10. EXTERNAL DEPENDENCIES

| Library | Usage |
|---------|-------|
| Alpine.js (CDN) | Reactive UI in interview take page |
| Web Speech API | Speech recognition (mic) + synthesis (AI voice) |
| WebRTC | Camera/microphone access |
| Fullscreen API | Proctoring - fullscreen mode |
| Lucide Icons | Icons throughout the UI |
| Inter Font (Google Fonts) | Interview page typography |
| jsonwebtoken (npm) | Interview invitation token generation |
| mysql2 (npm) | Database connection pool |

---

## 11. ALL ADMIN ROUTES SUMMARY

| Method | Route | Controller | Description |
|--------|-------|-----------|-------------|
| GET | `/admin/jobs` | `superAdmin.jobOpenings` | Job listings with AI matched counts |
| GET | `/admin/jobs/:id` | `superAdmin.jobDetail` | Job detail with funnel, candidates, bulk invite |
| POST | `/admin/jobs/:id/bulk-invite` | `superAdmin.bulkInvite` | Send AI interview to selected candidates |
| GET | `/admin/interviews` | `superAdmin.allInterviews` | All AI interviews taken (card grid) |
| GET | `/admin/interviews/:id` | `aiInterview.show` | Interview detail (scores, Q&A, recommendation) |
| GET | `/admin/candidates/:id` | `candidates.show` | Candidate profile (overview, education, docs, etc.) |
| POST | `/admin/candidates/:id/run-ai-match` | `candidates.runAIMatch` | Run AI match for candidate |
| POST | `/admin/candidates/:id/add-note` | `candidates.addNote` | Add HR note to candidate |

---

## 12. KEY BUSINESS LOGIC

### Resume Matching Thresholds
- **Applied candidates**: `match_score >= 50%` = AI Resume Matched
- **Non-applied candidates**: `match_score >= 90%` = AI Resume Matched
- Applied in: job listings count, job detail funnel, stage filter

### Interview Flow
1. Admin selects candidates on job detail page → "Send AI Interview"
2. All old interviews deleted → Fresh interview created with 6 questions
3. Candidate receives email with interview link (JWT token, 10-day expiry)
4. Candidate opens link → Setup screen (camera/mic permission)
5. Start → Fullscreen + proctoring enabled
6. Questions read aloud by AI → Mic captures speech → Auto-transcribed
7. "Save & Next" per question, "Submit & Finish" on last question
8. Answers evaluated by AI → Scores computed → Summary generated
9. Admin views results on `/admin/interviews/:id` detail page

### Score Types
- **Job Match Score**: From `atlas_rec_job_candidate_matches` (job-specific heuristic)
- **AI Screening Score**: From `atlas_rec_candidate_ai_screening` (general AI analysis)
- **Interview Score**: From `atlas_rec_ai_interviews` (AI interview evaluation)

### Question Generation
- Tries AI first (via `callAI()`) for unique per-candidate questions
- Falls back to built-in question banks if AI unavailable
- Bank selection: job title checked first (Professor → academic), then interview type
- Mixed bank selection: draws from primary + other banks for variety (pool of ~20 questions)

### Proctoring Features
- Fullscreen enforcement (auto-re-request on exit)
- Tab switch detection with violation counter
- Copy/paste/cut/right-click prevention
- Keyboard shortcut blocking (Escape, Backspace, Ctrl+C/V/A/X, F12)
- Text selection disabled on question text
- Answer area is read-only (voice input only)

---

## 13. FILES QUICK REFERENCE (for copy)

### Modified files (18):
```
src/routes/superAdmin.routes.js
src/routes/web.routes.js
src/controllers/superAdmin.controller.js
src/controllers/candidates.controller.js
src/controllers/aiInterview.controller.js
src/services/jobMatching.service.js
src/services/interview.service.js
src/services/ai/interviewQuestionGenerator.service.js
src/views/super-admin/jobs.ejs
src/views/super-admin/job-detail.ejs
src/views/candidates/detail.ejs
src/views/ai-interview/detail.ejs
src/views/ai-interview/take.ejs
src/views/layouts/main.ejs
src/middlewares/auth.middleware.js
src/public/css/atlas-theme.css
src/views/layouts/partials/sidebar.ejs
MIGRATION_FILES.md
```

### New files (1):
```
src/views/super-admin/interviews.ejs
```
