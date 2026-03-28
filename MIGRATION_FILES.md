# Migration Files - AI Recruitment Portal Changes

## Summary of Changes Made
This document lists all files modified during this session for migration to another project.

---

## 1. ROUTES (2 files)

### `src/routes/superAdmin.routes.js`
- Added admin routes for candidates and interviews:
  - `GET /admin/candidates/:id` - Candidate detail (admin context)
  - `POST /admin/candidates/:id/run-ai-match`
  - `POST /admin/candidates/:id/add-note`
  - `GET /admin/interviews/:id` - AI interview detail (admin context)

### `src/routes/web.routes.js`
- Root `/` redirects to `/admin/jobs`

---

## 2. CONTROLLERS (3 files)

### `src/controllers/superAdmin.controller.js`
- **jobOpenings**: AI Resume Matched count with dual thresholds (50% applied, 90% non-applied)
- **jobDetail**: CV Match funnel with threshold-aware filtering
- **bulkInvite**: Always creates fresh interview (deletes ALL old ones first)

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

## 4. VIEWS (5 files)

### `src/views/super-admin/jobs.ejs`
- Job listings card grid
- AI Resume Matched info note (50%/90% thresholds)
- Filter bar (search, scope, job role)
- Stats bar (total positions, academics, admin, applicants)

### `src/views/super-admin/job-detail.ejs`
- Funnel stats (Applied → CV Match → AI Interview Taken → Result 75%+)
- View selector (Applied vs AI Matches from Database)
- Stage filtering with threshold-aware logic (50% applied, 90% non-applied)
- Candidate cards with Job Match score, qualification, email, interview score
- Bulk invite selection bar
- Links use `/admin/candidates/:id`

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
  - Bottom: "Save & Next" / "Submit & Finish" (disabled until answered)
  - Top: "HR Interview" title, timer, Live indicator
- **Completion screen**: "Interview Completed Successfully!" with HR follow-up message
- **Already Completed screen**: Same message for revisits, no score shown
- **Voice**: Preloaded voice selection (Google US English, Samantha for Mac, etc.)
- **Proctoring**:
  - Fullscreen on start, auto-re-request on exit
  - Tab switch detection with warning overlay + violation count
  - Copy/cut/paste/right-click blocked
  - Escape, Backspace, Ctrl+C/V/A/X, F12, PrintScreen blocked
  - Text selection disabled on questions
- **Mic**: Keepalive timer (5s), fresh SpeechRecognition on restart, retry limits
- **Layout**: `html,body` height:100%, session div height:100vh, overflow:hidden

---

## 5. MIDDLEWARE (1 file)

### `src/middlewares/auth.middleware.js`
- **isGuest**: Redirect changed from `/dashboard` to `/admin/jobs`

---

## 6. CSS (1 file)

### `src/public/css/atlas-theme.css`
- `.main-content`: Added `overflow-x: hidden` to prevent horizontal scroll

---

## 7. DATABASE TABLES USED

| Table | Purpose |
|-------|---------|
| `atlas_rec_job_candidate_matches` | Job-specific match scores (50%/90% thresholds) |
| `atlas_rec_candidate_ai_screening` | AI screening results, extracted skills |
| `atlas_rec_ai_interviews` | Interview records with scores |
| `atlas_rec_ai_interview_questions` | Generated interview questions |
| `atlas_rec_ai_interview_answers` | Candidate answers with AI evaluation |
| `dice_staff_recruitment` | Candidate applications/profiles |
| `isdi_admsn_applied_for` | Job openings/positions |
| `atlas_rec_activity_logs` | Candidate activity logs |
| `atlas_rec_status_history` | Candidate status history |

---

## 8. DEPENDENCY FILES (not modified, but required)

| File | Purpose |
|------|---------|
| `src/services/fileUrl.service.js` | Builds file URLs for profile photos & documents |
| `src/repositories/candidate.repository.js` | Candidate DB queries (findById, etc.) |
| `src/repositories/interview.repository.js` | Interview CRUD operations |
| `src/repositories/job.repository.js` | Job DB queries |
| `src/repositories/screening.repository.js` | Screening DB queries |
| `src/services/ai/aiProvider.service.js` | AI provider abstraction (callAI) |
| `src/services/ai/interviewEvaluator.service.js` | Answer evaluation + summary |
| `src/services/ai/scoring.service.js` | Score calculation + recommendation |
| `src/services/notification.service.js` | Email notification sending |
| `src/services/candidate.service.js` | Candidate business logic |
| `src/utils/promptTemplates.js` | AI prompt templates |
| `src/config/db.js` | MySQL connection pool |
| `src/config/env.js` | Environment variables |
| `src/config/constants.js` | Constants (statuses, pagination) |
| `src/utils/logger.js` | Winston logger |
| `src/middlewares/error.middleware.js` | asyncHandler wrapper |
| `src/views/layouts/main.ejs` | Main layout (sidebar + topbar + content) |
| `src/views/layouts/partials/sidebar.ejs` | Sidebar navigation |
| `src/views/layouts/partials/topbar.ejs` | Top navigation bar |
| `src/views/layouts/partials/footer.ejs` | Page footer |
| `src/views/layouts/partials/alerts.ejs` | Flash message alerts |
| `src/app.js` | Express app (fileUrlService in res.locals) |

---

## 9. EXTERNAL DEPENDENCIES

| Library | Usage |
|---------|-------|
| Alpine.js (CDN) | Reactive UI in interview take page |
| Web Speech API | Speech recognition (mic) + synthesis (AI voice) |
| WebRTC | Camera/microphone access |
| Fullscreen API | Proctoring - fullscreen mode |
| Lucide Icons | Icons throughout the UI |
| Inter Font (Google Fonts) | Interview page typography |

---

## 10. KEY BUSINESS LOGIC

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
9. Admin views results on interview detail page

### Score Types
- **Job Match Score**: From `atlas_rec_job_candidate_matches` (job-specific heuristic)
- **AI Screening Score**: From `atlas_rec_candidate_ai_screening` (general AI analysis)
- **Interview Score**: From `atlas_rec_ai_interviews` (AI interview evaluation)
