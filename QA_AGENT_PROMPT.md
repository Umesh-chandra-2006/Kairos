# QA Agent Testing Prompt

> **Copy-paste this prompt into an AI agent session to execute the full QA cycle.**
> The agent MUST follow each phase sequentially, produce a structured report, and
> stop on any critical failure before proceeding.

---

## System Context

You are a senior QA engineer testing **Kairos**, an interview-prep platform with voice AI evaluation. The project is at `D:\kairos (3)`. It is a pnpm monorepo with:

- `apps/api` — Express 4 + Drizzle ORM + MySQL (port 3307) + Redis/BullMQ (port 6380)
- `apps/web` — React Vite frontend (port 5173)
- `packages/db` — Shared Drizzle schema + migrations
- `packages/shared` — Constants, types, validation schemas

**Infrastructure:** Docker containers `kairos-mysql` (:3307) and `kairos-redis` (:6380). If containers are down, run `pnpm docker:up` and wait for health checks. MySQL credentials: `root:root`.

**Test database:** `kairos_test` on `localhost:3307`. Created fresh by `pnpm --filter api exec vitest run` (setup.ts calls `runMigrations()`). If migrations changed, drop it first: `mysql -u root -proot -P 3307 -e "DROP DATABASE IF EXISTS kairos_test;"`

**Branch:** `feat/phase-1-voice-eval`. The code includes Phases 0-3 + Wave 2 features.

**Baseline:** 140/140 automated tests passing, both typechecks clean.

---

## Rules

1. **Work sequentially through the phases.** Do not skip ahead.
2. **For every phase, report PASS or FAIL per scenario.** Use the exact IDs from the testing plan.
3. **On any FAIL, diagnose the root cause before moving on.** Include the error message, the file/line, and your hypothesis.
4. **If a critical test fails (>3 failures in any single phase), STOP and report.** Do not continue to later phases until the blocker is resolved.
5. **Use `curl` or `httpie` for API calls.** The API runs on `localhost:4000`. Always include `Content-Type: application/json` for POST/PUT.
6. **For tests that require auth, register a fresh user first** via `POST /api/auth/register` and capture the `accessToken` from the response.
7. **Use unique emails** for each user: prefix + timestamp + random suffix.
8. **Never modify production data.** Only work in the `kairos_test` database.
9. **After completing all phases, produce a final Summary Report** with pass/fail counts, issues found, and recommendations.

---

## Phase 0 — Environment Verification

Verify the environment is healthy before testing anything.

### Step 0.1: Infrastructure

```bash
# Check Docker containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr kairos

# If not running:
pnpm docker:up
# Wait 15 seconds, then re-check
```

**Expected:** `kairos-mysql` shows "healthy" or "Up" on port 3307, `kairos-redis` on port 6379.

### Step 0.2: Drop and recreate test database

```bash
mysql -u root -proot -P 3307 -e "DROP DATABASE IF EXISTS kairos_test;"
```

### Step 0.3: Run full test suite

```bash
pnpm --filter api exec vitest run 2>&1
```

**Expected:** 140 tests pass, 0 fail. Report the exact count and any warnings.

### Step 0.4: Typechecks

```bash
pnpm --filter @kairos/api typecheck 2>&1
pnpm --filter @kairos/web typecheck 2>&1
```

**Expected:** Zero `error TS` lines in both. The web typecheck may show warnings about `apps/mobile` — ignore those.

### Step 0.5: Start API server (for manual API testing)

```bash
pnpm --filter api dev
```

Wait for `API running on :4000` or similar. Then in a separate terminal proceed to Phase 1.

**Report format for Phase 0:**

```
Phase 0: ENVIRONMENT VERIFICATION
- Docker containers: PASS/FAIL (details)
- Test suite: PASS/FAIL (X/140 passed)
- API typecheck: PASS/FAIL
- Web typecheck: PASS/FAIL
- API server: RUNNING/FAILED
```

---

## Phase 1 — Authentication & Onboarding

Register users, test auth flows, verify token lifecycle.

### Helper function

For every test that needs auth, run this first:

```bash
# Register user
curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"QA Test","email":"qa_TIMESTAMP_RANDOM@test.dev","password":"Passw0rd!","device":"mobile"}'

# Save the accessToken from response for subsequent calls
```

### Tests

Execute each test case from **TESTING_PLAN.md Section 1** (IDs 1.1 through 1.13):

| ID | Command sketch | Assert |
|----|----------------|--------|
| 1.1 | POST /api/auth/register valid | Status 200, body has accessToken, refreshToken, user.id, user.emailVerified === false |
| 1.2 | POST /api/auth/register same email again | Status 409 |
| 1.3 | POST /api/auth/register with password "short" | Status 400, body has error.code === "VALIDATION_ERROR" and error.details contains path ["password"] |
| 1.4 | POST /api/auth/register with body "not json {{{" | Status 400 (NOT 500) |
| 1.5 | POST /api/auth/login with correct creds | Status 200, body has accessToken |
| 1.6 | POST /api/auth/login wrong password | Status 401 |
| 1.7 | POST /api/auth/refresh with valid refreshToken | Status 200, new refreshToken !== old refreshToken |
| 1.8 | POST /api/auth/refresh with same token again | Status 401 |
| 1.9 | GET /api/auth/me with Bearer | Status 200, body.user.id matches registered user |
| 1.10 | GET /api/auth/me no Authorization header | Status 401 |
| 1.11 | PUT /api/auth/me/onboarding with role/level/targets/notificationTime | Status 200 |
| 1.12 | POST /api/auth/forgot-password with registered email | Status 200, body.ok === true |
| 1.13 | Register, POST /api/auth/logout, then POST /api/auth/refresh with old token | Status 401 |

**For each test, record:**
- Test ID
- HTTP status code
- Key assertion result (PASS/FAIL)
- Response body snippet (first 200 chars)

**Report format:**
```
Phase 1: AUTH & ONBOARDING
1.1  PASS - 200, tokens returned
1.2  PASS - 409 on duplicate
...
1.13 PASS - refresh rejected after logout
Result: 13/13 PASS
```

---

## Phase 2 — Daily Question & Submission

Test the core daily question assignment and answer submission flow.

### Setup

Register a fresh user, get accessToken.

### Tests

Execute **Section 2** (IDs 2.1 through 2.8):

| ID | Command sketch | Assert |
|----|----------------|--------|
| 2.1 | GET /api/questions/today with Bearer | Status 200, body has question.id, question.text, question.category, alreadyAnswered === false |
| 2.2 | Register user B, GET /api/questions/today | Same questionId as user A (same day = deterministic) |
| 2.3 | POST /api/answers/submit with questionId + answerText (>= 20 chars) | Status 201, body has answerId |
| 2.3b | Poll GET /api/answers/ANSWER_ID until status === "completed" or timeout 30s | Status 200, eventually completed |
| 2.4 | POST /api/answers/submit again same day | Status 409 |
| 2.5 | POST /api/answers/submit with answerText "short" | Status 400 |
| 2.6 | GET /api/answers?limit=20 | Status 200, body.answers is array, first entry has questionId |
| 2.7 | POST /api/answers/submit no Bearer | Status 401 |
| 2.8 | After submit, GET /api/answers/ANSWER_ID/stream?token=ACCESS_TOKEN | Status 200, Content-Type: text/event-stream, eventually sends done event |

**For 2.3b polling**, use a loop:
```bash
for i in {1..15}; do
  curl -s http://localhost:4000/api/answers/$ANSWER_ID -H "Authorization: Bearer $TOKEN"
  sleep 2
done
```

**Report format:**
```
Phase 2: DAILY QUESTION & SUBMISSION
2.1  PASS - question returned
2.2  PASS - deterministic (same questionId)
...
2.8  PASS - SSE stream completed
Result: 8/8 PASS
```

---

## Phase 3 — Practice Mode

Test practice questions and verify they don't affect daily streak.

### Tests (Section 3, IDs 3.1-3.4)

| ID | Command sketch | Assert |
|----|----------------|--------|
| 3.1 | GET /api/questions/practice with Bearer | Status 200, body.question has text + category |
| 3.2 | GET /api/questions/practice?category=DSA | Status 200, body.question.category === "DSA" |
| 3.3 | First GET streak, then POST /api/answers/practice, then GET streak again | Streak unchanged after practice |
| 3.4 | After practice answer, GET /api/questions/today | stillAnswered === false |

---

## Phase 4 — Voice Submission Pipeline

### Automated tests (Section 4, IDs 4.1-4.4)

| ID | Command sketch | Assert |
|----|----------------|--------|
| 4.1 | POST /api/submissions/voice no Bearer | Status 401 |
| 4.2 | POST /api/submissions/voice?questionId=1&idempotencyKey=qa-test-001 with audio body | Status 202, poll evaluation until completed |
| 4.3 | POST same idempotencyKey again | Status 200, idempotent: true |
| 4.4 | POST empty body | Status 400 |

### Manual voice verification (Section 4, IDs 4.5-4.9)

These require browser interaction. Navigate to Practice page, toggle to voice mode:

| ID | What to check | How |
|----|---------------|-----|
| 4.5 | 90s rep E2E | Click mic, record for 90s, click stop. Verify status cycles queued->transcribing->evaluating->completed |
| 4.6 | Language detection | Record non-English audio. Check for languageBlocked error |
| 4.7 | Short recording | Record < 5s. Should be rejected |
| 4.8 | Network resilience | Start recording, disconnect WiFi, stop recording. Should show error gracefully |
| 4.9 | Delivery metrics | After completed voice rep, check response has wordCount, durationMs, wordsPerMinute |

---

## Phase 5 — V2 Evaluation Contract

Verify the evaluation contract structure and state machine.

### Tests (Section 5, IDs 5.1-5.5)

| ID | What to check |
|----|---------------|
| 5.1 | After any completed evaluation, response has contractVersion: 1, overallBand in [needs_work, solid, strong], all dimension scores present (content, structure with 4 sub-scores, delivery) |
| 5.2 | delivery.source === "deterministic" always (even when content.source === "model") |
| 5.3 | After text answer completes, answers.score is 4 (needs_work), 6 (solid), or 8 (strong). answers.feedback is non-null |
| 5.4 | Row exists in evaluation_versions table with overallBand matching the evaluation response |
| 5.5 | Verify state transitions: answer starts as "pending" -> "queued" -> "processing" -> "completed". No illegal transitions |

For 5.4, query the database directly:
```bash
mysql -u root -proot -P 3307 kairos_test -e "SELECT id, answerId, overallBand FROM evaluation_versions WHERE answerId = ANSWER_ID;"
```

---

## Phase 6 — Adaptive Engine & Spaced Repetition

### Automated (Section 6, IDs 6.1-6.5)

| ID | What to check |
|----|---------------|
| 6.1 | After completing a daily answer, query: `SELECT * FROM user_questions WHERE userId = USER_ID AND questionId = QUESTION_ID` — row exists with nextReviewAt, intervalDays=1, easeFactor=2.5 |
| 6.2 | Manually update easeFactor in DB, call SM-2 function, verify easeFactor increased and intervalDays increased |
| 6.3 | Set nextReviewAt to yesterday, request practice question — due question appears |
| 6.4 | Complete 3+ answers in same category with band "needs_work", then request practice — next question skews toward that category |
| 6.5 | Complete 5+ answers in same category, compute skill profile — returns category scores with evidence count >= 5 |

### Manual adaptive (Section 6, IDs 6.6-6.8)

| ID | Steps | Expected |
|----|-------|----------|
| 6.6 | Answer 3 DBA questions, all strong | Next DBA question is harder difficulty |
| 6.7 | Answer 2 OS questions, both needs_work | Next OS question is easier |
| 6.8 | Answer 5 Networks questions, all strong | Next question switches to a different weak category |

---

## Phase 7 — Follow-Ups, Model Answers & Rubrics

### Tests (Section 7 + 8, IDs 7.1-8.3)

| ID | What to check |
|----|---------------|
| 7.1 | After weak answer evaluation, query follow_ups table — row has questionText + weakAreas JSON |
| 7.2 | GET /api/answers/ANSWER_ID/follow-up — returns array of objects with questionText |
| 7.3 | GET /api/questions/QUESTION_ID/model-answer?level=intermediate — returns { content } with non-empty string |
| 7.4 | Call model-answer twice — second returns same content, no duplicate rows in model_answers |
| 8.1 | generateRubric() returns { version: 1, criteria: [...] } where each criterion has id, description (non-empty), weight (>0), required (boolean) |
| 8.2 | Call generateRubric twice for same question — no duplicate rows |
| 8.3 | Validate all criteria fields: description.length > 0, weight > 0, typeof required === "boolean" |

---

## Phase 8 — Streaks, Leaderboard & Notifications

### Streaks (Section 9, IDs 9.1-9.6)

| ID | What to check |
|----|---------------|
| 9.1 | GET /api/streak new user — current: 0, longest: 0, freezesRemaining >= 0 |
| 9.2 | Answer today, GET /api/streak — current >= 1 |
| 9.3 | Insert answer for yesterday in DB, answer today, skip tomorrow, answer day after — streak uses freeze |
| 9.4 | Skip 2 consecutive days — streak resets to 0, freeze not consumed |
| 9.5 | POST /api/streak/refill — returns updated streak |
| 9.6 | GET /api/leaderboard — entries array non-empty; GET /api/leaderboard/me/rank — returns rank number |

### Notifications (Section 10, IDs 10.1-10.7)

| ID | What to check |
|----|---------------|
| 10.5 | GET /api/notifications/vapid-public-key — { publicKey: string or null } |
| 10.6 | POST /api/notifications/push-subscriptions with { endpoint, keys }, GET /api/notifications/subscriptions — returns registered subscription |
| 10.7 | GET /api/answers/weekly-summary — { answered (number), avgScore (number or null), weakestCategory (string or null) } |

---

## Phase 9 — Analytics & Feature Flags

### Analytics (Section 11, IDs 11.1-11.4)

| ID | What to check |
|----|---------------|
| 11.1 | POST /api/analytics/events with [{ name: "app_open", props: {} }] — Status 202, accepted: 1 |
| 11.2 | POST with name "fake_event" — Status 400 |
| 11.3 | POST with 101 events — Status 400 |
| 11.4 | POST without Bearer — Status 401 |

### Feature Flags (Section 12, IDs 12.1-12.4)

| ID | What to check |
|----|---------------|
| 12.1 | GET /api/flags — object with keys: voice_v2, new_evaluator, delivery_metrics, adaptive_followup, skill_engine, adaptive_question_selection, tpo_dashboard, whatsapp |
| 12.2 | All values are booleans |
| 12.3 | Verify default is false for all (no flag rows in test DB by default) |

---

## Phase 10 — Labeling Queue (Band Confirmation)

### API tests (Section 13, IDs 13.1-13.6)

| ID | Command sketch | Assert |
|----|----------------|--------|
| 13.1 | Register user, create completed answer in DB, POST /api/answers/ID/confirm { confirmed: true } | Status 200, confirmation.confirmed === true |
| 13.2 | Create pending answer, POST confirm | Status 409 |
| 13.3 | Confirm same answer twice with different values | Second call updates (not duplicates) |
| 13.4 | GET /api/answers/ID/confirmation | Returns saved confirmation |
| 13.5 | User A creates answer, User B tries to confirm it | Status 404 |
| 13.6 | POST confirm with { confirmed: false, comment: "Too harsh" } | comment === "Too harsh" |

For 13.1, creating a completed answer in DB:
```bash
mysql -u root -proot -P 3307 kairos_test -e "
  INSERT INTO answers (userId, questionId, date, answerText, status, score)
  VALUES (USER_ID, 1, '2026-01-01', 'Test answer for labeling queue', 'completed', 7);
"
```

---

## Phase 11 — TPO Dashboard & Tenancy

### TPO access control (Section 14, IDs 14.1-14.6)

Setup: Create 3 users:
1. TPO user: role=tpo, collegeId="college_a"
2. Student A: collegeId="college_a"
3. Student B: collegeId="college_b"

```bash
# Create users, then update roles:
mysql -u root -proot -P 3307 kairos_test -e "
  UPDATE users SET role='tpo', collegeId='college_a' WHERE id=TPO_ID;
  UPDATE users SET collegeId='college_a' WHERE id=STUDENT_A_ID;
  UPDATE users SET collegeId='college_b' WHERE id=STUDENT_B_ID;
"
```

| ID | Command sketch | Assert |
|----|----------------|--------|
| 14.1 | GET /api/tpo/activation with TPO-A token | Status 200, students array only contains college_a users |
| 14.2 | GET /api/tpo/activation with student token | Status 403 |
| 14.3 | Verify Student B's ID NOT in activation response | Confirmed absent |
| 14.4 | GET /api/tpo/activation with TPO who has no collegeId | Status 403 |
| 14.5 | GET /api/tpo/activation no Bearer | Status 401 |
| 14.6 | Query tpo_views table after TPO query | Row exists with correct userId, collegeId, queryType |

### All 6 TPO endpoints (Section 14):

| Endpoint | Verify |
|----------|--------|
| GET /api/tpo/activation | 200, students is array with userId, name, email, totalAnswers, avgScore |
| GET /api/tpo/improvement | 200, students is array with earlyAvg, lateAvg |
| GET /api/tpo/weak-skills | 200, skills is array with questionId, avgScore, answerCount |
| GET /api/tpo/intervention | 200, students is array (may be empty if all students active) |
| GET /api/tpo/readiness-trend | 200, weeks is array with weekStart, avgScore, activeStudents, strongCount |
| GET /api/tpo/calibration-stats | 200, stats is array with totalConfirmations, agreementRate |

### College tenancy (Section 15, IDs 15.1-15.6)

| ID | What to check |
|----|---------------|
| 15.1 | GET /api/auth/me — user object has collegeId field (may be null) |
| 15.2 | Enable feature flag for college_a only, verify college_b user doesn't see it |
| 15.3 | Analytics event with collegeId — verify collegeId persisted in analytics_events table |
| 15.4 | Users table accepts role='tpo' (no enum error) |
| 15.5 | `DESCRIBE outcome_reports` — columns exist: id, userId, collegeId, interviewsAttended, companies, roundsReached, result, offers, notes, selfReportedAt |
| 15.6 | After TPO query, `SELECT * FROM tpo_views WHERE userId = TPO_ID` — rows present |

---

## Phase 12 — Observability & Error Handling

### Tests (Section 16, IDs 16.1-16.6)

| ID | Command sketch | Assert |
|----|----------------|--------|
| 16.1 | curl -s -D - http://localhost:4000/api/health | Response headers contain x-request-id (auto-generated) |
| 16.2 | curl -s -D - -H "x-request-id: my-custom-id-123" http://localhost:4000/api/health | Response x-request-id === "my-custom-id-123" |
| 16.3 | curl -s -D - -H "x-request-id: ../../etc/passwd" http://localhost:4000/api/health | Response x-request-id is NOT "../../etc/passwd" (replaced) |
| 16.4 | GET /api/auth/me no token | Response body has error.retryable === false |
| 16.5 | GET /api/nonexistent | Response body has error.code === "NOT_FOUND", error.retryable === false |

---

## Phase 13 — Web UI Smoke Tests (if web server available)

If the web dev server is running on :5173, perform these browser-level checks. If not available, note "SKIPPED - web server not running" and proceed.

### 18.1 Auth Flow

| ID | Steps | Expected |
|----|-------|----------|
| 18.1.1 | Navigate to localhost:5173, fill register form, submit | Redirect to onboarding page |
| 18.1.2 | Select role/level/targets, submit | Redirect to dashboard |
| 18.1.3 | Logout, login with same creds | Dashboard with streak visible |
| 18.1.4 | Click "forgot password", enter email | Confirmation message shown |

### 18.2 Daily Question

| ID | Steps | Expected |
|----|-------|----------|
| 18.2.1 | Load dashboard | Question text, category badge, difficulty visible |
| 18.2.2 | Type >= 20 chars, submit | Status changes to evaluating, real-time updates |
| 18.2.3 | Wait for completion | Band displayed (Needs Work / Solid / Strong), feedback text, model answer |
| 18.2.4 | Navigate away and back | Already answered state, previous answer shown |
| 18.2.5 | Check streak counter | Visible on dashboard |

### 18.3 Practice Mode

| ID | Steps | Expected |
|----|-------|----------|
| 18.3.1 | Navigate to practice | Practice page loads with question |
| 18.3.2 | Select category filter | Only that category shown |
| 18.3.3 | Submit answer | Evaluation completes, streak unchanged |
| 18.3.4 | Complete a weak answer | Follow-up card appears below result |

### 18.4 Voice Mode

| ID | Steps | Expected |
|----|-------|----------|
| 18.4.1 | Toggle to voice mode | Mic button visible |
| 18.4.2 | Click mic, record | Timer counts up |
| 18.4.3 | Click stop, submit | Upload + processing stages shown |
| 18.4.4 | Wait for completion | Bands + delivery metrics displayed |

---

## Phase 14 — Content Pipeline Unit Verification

Verify the content services work correctly in the test environment.

### Tests (Section 17, IDs 17.1-17.6)

These are covered by the automated test suite (`contentPipeline.test.ts`). Verify they pass in the full suite run. Additionally:

| ID | What to check |
|----|---------------|
| 17.1 | Rubric generation returns version: 1, criteria array with >= 1 entry |
| 17.2 | Model answer generates content, caches in DB |
| 17.3 | Follow-up returns questionText (non-empty) + weakAreas (array) |
| 17.4 | Coach digest returns summary (>= 20 chars), highlights (array), nextFocus (string) |
| 17.5 | MockAIProvider.completeJSON returns object with reasoning field |
| 17.6 | completeJSON accepts { system, user } object (not positional args) |

---

## Final Report Template

After completing all phases, produce this report:

```
# QA Test Report — Kairos V2
**Date:** YYYY-MM-DD
**Tester:** QA Agent
**Branch:** feat/phase-1-voice-eval
**Commit:** (git log --oneline -1)

## Executive Summary
- Total scenarios tested: ___/128
- Automated pass: ___/97
- Manual pass: ___/31
- Critical failures: ___
- Blockers: ___

## Phase Results

| Phase | Name | Pass | Fail | Skip | Notes |
|-------|------|------|------|------|-------|
| 0 | Environment | | | | |
| 1 | Auth & Onboarding | | | | |
| 2 | Daily Question | | | | |
| 3 | Practice Mode | | | | |
| 4 | Voice Pipeline | | | | |
| 5 | V2 Evaluation | | | | |
| 6 | Adaptive & SR | | | | |
| 7 | Follow-ups & Models | | | | |
| 8 | Streaks & Leaderboard | | | | |
| 9 | Analytics & Flags | | | | |
| 10 | Labeling Queue | | | | |
| 11 | TPO Dashboard | | | | |
| 12 | Observability | | | | |
| 13 | Web UI Smoke | | | | |
| 14 | Content Pipeline | | | | |

## Detailed Failures

### [FAIL] Phase X — Scenario X.X
- **Scenario:** [description]
- **Expected:** [what should happen]
- **Actual:** [what happened]
- **Error:** [error message / response body]
- **Hypothesis:** [likely root cause]
- **File/Line:** [relevant source location]

(repeat for each failure)

## Recommendations
1. [Priority 1 fix]
2. [Priority 2 fix]
3. [Nice to have]

## Release Readiness
- [ ] Calibration gate (>=85% agreement): PENDING — requires real student data
- [ ] Band-flip gate (<=15%): PENDING — requires benchmark set
- [ ] TPO engagement gate: PENDING — requires pilot deployment
- [ ] All automated tests green: YES/NO
- [ ] Both typechecks clean: YES/NO
```

---

## Important Notes for the Agent

1. **The API in test mode uses MockAIProvider.** All evaluations return deterministic mock data. Do not expect real AI-generated content.

2. **The `apps/mobile` typecheck failure is pre-existing and unrelated.** Do not flag it as a new issue.

3. **Some features are API-only** (TPO dashboard, band confirmation API). The web UI for these has not been built yet. Mark these as "API complete, UI not implemented" in the report.

4. **For DB queries**, use: `mysql -u root -proot -P 3307 kairos_test -e "SQL_QUERY"`

5. **For checking the evaluation_versions table**: `mysql -u root -proot -P 3307 kairos_test -e "SELECT * FROM evaluation_versions ORDER BY id DESC LIMIT 5\G"`

6. **Rate limiting is set high in test mode** (10000). Do not worry about hitting rate limits.

7. **The SSE stream endpoint** uses `?token=ACCESS_TOKEN` query param (not Bearer header) because EventSource cannot set headers.

8. **MySQL table names are camelCase in Drizzle** but **snake_case in the actual MySQL database**. For example, `evaluationVersions` in code = `evaluation_versions` in SQL.

9. **When creating test data in the DB**, always use INSERT and note the insertId for subsequent queries. Clean up with DELETE in reverse order.

10. **If Docker is not running**, the agent should start it with `pnpm docker:up` and wait 15-20 seconds for MySQL health check to pass before proceeding.
