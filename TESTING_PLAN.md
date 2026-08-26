# Kairos - QA Testing Plan

> **Version:** 1.0 | **Date:** 2026-08-26
> **Scope:** Phases 0-3 + Wave 2 (all committed features)
> **Automated tests:** 140/140 passing | **Typechecks:** clean (api + web)

## How to run

```bash
# Start infrastructure
pnpm docker:up

# Full test suite
pnpm --filter api exec vitest run

# Single test file
pnpm --filter api exec vitest run src/test/bandConfirmation.test.ts

# Typechecks
pnpm --filter @kairos/api typecheck
pnpm --filter @kairos/web typecheck
```

---

## 1 - Authentication & Onboarding (13 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 1.1 | Register | POST /api/auth/register valid email + password | 200 with tokens, emailVerified: false |
| 1.2 | Duplicate email | Register same email twice | 409 |
| 1.3 | Weak password | Password "short" | 400 with field-level details |
| 1.4 | Malformed JSON | Garbage body | 400 (not 500) |
| 1.5 | Login | POST /api/auth/login correct creds | 200 with accessToken |
| 1.6 | Wrong password | Wrong password | 401 |
| 1.7 | Token rotation | POST /api/auth/refresh | Returns different refreshToken |
| 1.8 | Used refresh token | Same refresh token twice | Second: 401 |
| 1.9 | /me | GET /api/auth/me with Bearer | Correct user |
| 1.10 | /me no token | No Authorization | 401 |
| 1.11 | Onboarding | PUT /api/auth/me/onboarding | Profile saved |
| 1.12 | Forgot password | POST /api/auth/forgot-password | 200 { ok: true } |
| 1.13 | Logout | Register, logout, use old refresh | 401 |

---

## 2 - Daily Question & Submission (8 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 2.1 | Today's question | GET /api/questions/today | Question with category, alreadyAnswered: false |
| 2.2 | Deterministic | Two users call today same day | Same questionId |
| 2.3 | Submit answer | POST /api/answers/submit >=20 chars | 201, status -> completed |
| 2.4 | Duplicate daily | Submit twice same day | 409 |
| 2.5 | Too short | < 20 chars | 400 |
| 2.6 | History | GET /api/answers?limit=20 | Answers with correct questionId |
| 2.7 | Auth required | No Bearer | 401 |
| 2.8 | SSE stream | Submit, GET /:id/stream?token= | Stream sends done event |

---

## 3 - Practice Mode (4 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 3.1 | Random question | GET /api/questions/practice | Question with text, category |
| 3.2 | Category filter | ?category=DSA | category === DSA |
| 3.3 | After daily | Submit daily then practice | Streak unchanged, isPractice: true |
| 3.4 | Not daily | After practice, GET today | stillAnswered: false |

---

## 4 - Voice Pipeline (4 automated + 5 manual)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 4.1 | Auth required | No Bearer on /voice | 401 |
| 4.2 | Full E2E | POST /voice with audio -> poll evaluation | Completed with transcript, bands, delivery.source: deterministic |
| 4.3 | Idempotent | Same idempotencyKey twice | 200 { idempotent: true } |
| 4.4 | Bad input | Empty body / bad questionId | 400 / 404 |

**Manual (requires real audio):**

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 4.5 | 90s rep | Record 90s -> stop | Status cycles queued -> completed, bands shown |
| 4.6 | Wrong language | Record non-English | languageBlocked: true, error shown |
| 4.7 | Too short | Record < 5s | Rejected |
| 4.8 | Network drop | Disconnect mid-upload | Graceful error, no orphaned state |
| 4.9 | Delivery metrics | Complete voice rep | wordCount, durationMs, wordsPerMinute present |

---

## 5 - V2 Evaluation Contract (5 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 5.1 | Contract structure | Any completed eval | contractVersion: 1, band in [needs_work, solid, strong] |
| 5.2 | Deterministic delivery | Any eval | delivery.source === "deterministic" |
| 5.3 | Legacy backfill | Complete text answer | answers.score set (4/6/8 by band) |
| 5.4 | Version persisted | Complete eval | Row in evaluation_versions matching overallBand |
| 5.5 | State machine | Submit flow | All transitions legal, CAS claim works |

---

## 6 - Adaptive Engine & Spaced Repetition (5 automated + 3 manual)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 6.1 | SR row created | Complete daily answer | user_questions row with nextReviewAt, intervalDays: 1 |
| 6.2 | SM-2 update | Rate answer strong | easeFactor increases, intervalDays increases |
| 6.3 | Due reviews mixed | Past nextReviewAt | Due questions in practice pool |
| 6.4 | Adaptive picker | Weak categories exist | Questions skew toward weak areas |
| 6.5 | Skill profile | Several answers same category | Category scores with evidence count |

**Manual:**

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 6.6 | Difficulty up | 3 strong in DBA | Next DBA harder |
| 6.7 | Difficulty down | 2 needs_work in OS | Next OS easier |
| 6.8 | Category switch | 5 strong in Networks | Next from different weak category |

---

## 7 - Follow-Ups & Model Answers (4 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 7.1 | Follow-up generated | Weak answer evaluated | follow_ups row with questionText, weakAreas |
| 7.2 | GET follow-ups | GET /api/answers/:id/follow-up | Array of follow-up questions |
| 7.3 | Model answer cached | GET /api/questions/:id/model-answer | Returns content |
| 7.4 | Model answer idempotent | Call twice | Cached, no duplicates |

---

## 8 - Rubric System (3 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 8.1 | Generate | generateRubric(text, hints) | version: 1, criteria with id/desc/weight/required |
| 8.2 | Cached | Call twice same question | No duplicate DB rows |
| 8.3 | Validation | Check criteria | description non-empty, weight > 0 |

---

## 9 - Streaks & Leaderboard (6 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 9.1 | New user | GET /api/streak | current: 0, longest: 0 |
| 9.2 | Increment | Answer today + yesterday | current >= 1 |
| 9.3 | Freeze | Miss 1 day with freeze | Streak continues |
| 9.4 | 2+ gap | Miss 2 days | Reset to 0, no freeze |
| 9.5 | Refill | POST /api/streak/refill | Updated streak |
| 9.6 | Leaderboard | Submit answers | Entries + rank returned |

---

## 10 - Notifications (7 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 10.1 | Daily reminder | enqueueDailyReminders eligible user | 1 outbox entry |
| 10.2 | Idempotent | Run twice | Second: 0 |
| 10.3 | Skip answered | User answered today | 0 |
| 10.4 | Drain | drainOutbox() | Status -> sent |
| 10.5 | VAPID key | GET /api/notifications/vapid-public-key | { publicKey } |
| 10.6 | Push CRUD | Register, list, unregister | Works E2E |
| 10.7 | Weekly summary | GET /api/answers/weekly-summary | answered, avgScore, weakestCategory |

---

## 11 - Analytics (4 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 11.1 | Batch ingest | POST 2 events | 202 accepted: 2, userId stamped |
| 11.2 | Unknown event | Bad event name | 400 |
| 11.3 | Oversized batch | 101 events | 400 |
| 11.4 | Auth required | No Bearer | 401 |

---

## 12 - Feature Flags (4 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 12.1 | List flags | GET /api/flags | All flag keys as booleans |
| 12.2 | Default off | No DB rows | All false |
| 12.3 | Enable | Insert enabled: true | Returns true |
| 12.4 | Per-env | Enable in test only | true in test, false in prod |

**Flags:** voice_v2, new_evaluator, delivery_metrics, adaptive_followup, skill_engine, adaptive_question_selection, tpo_dashboard, whatsapp

---

## 13 - Labeling Queue (6 automated + 4 manual)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 13.1 | Confirm completed | POST /answers/:id/confirm { confirmed: true } | 200 confirmed: true |
| 13.2 | Reject pending | Confirm pending answer | 409 |
| 13.3 | Upsert | Confirm twice different values | Updated, not duplicated |
| 13.4 | GET confirmation | GET /answers/:id/confirmation | Saved confirmation |
| 13.5 | Cross-user | User A confirms User B answer | 404 |
| 13.6 | Comment | { confirmed: false, comment: "Too harsh" } | Comment saved |

**Manual (after UI wire-up):**

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 13.7 | Post-eval prompt | Complete evaluation | "Was this fair?" with thumbs up/down |
| 13.8 | Confirm dismiss | Click thumbs up | Saved, prompt disappears |
| 13.9 | Dispute | Click thumbs down, type comment | Saved with comment |
| 13.10 | No duplicate | Revisit confirmed answer | No prompt |

---

## 14 - TPO Dashboard (6 automated + 4 manual)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 14.1 | TPO access | TPO-A GET /tpo/activation | 200, only college_a |
| 14.2 | Student rejected | Student GET /tpo/activation | 403 |
| 14.3 | Cross-college isolation | TPO-A activation query | College-B students never appear |
| 14.4 | No collegeId | TPO without collegeId | 403 |
| 14.5 | Auth required | No Bearer | 401 |
| 14.6 | Audit log | Any TPO query | tpo_views row logged |

**Endpoints (all require role: tpo):**

| Endpoint | Purpose |
|----------|---------|
| GET /api/tpo/activation | Who is practicing (per-student totals, recent, avg) |
| GET /api/tpo/improvement | Score trend (4-week early/late avg) |
| GET /api/tpo/weak-skills | Lowest avg score per question |
| GET /api/tpo/intervention | Inactive >14 days |
| GET /api/tpo/readiness-trend | Weekly band distribution longitudinal |
| GET /api/tpo/calibration-stats | Confirmation count + agreement rate |

**Manual:**

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 14.7 | College scoping | Log in as college_a TPO | Only college_a data |
| 14.8 | Intervention accuracy | Student inactive >14d | Appears in list |
| 14.9 | Trend ordering | Multiple weeks data | Ordered by week ascending |
| 14.10 | Calibration | Students confirm bands | agreementRate updates |

---

## 15 - College Tenancy (6 items)

| ID | Scenario | Expected |
|----|----------|----------|
| 15.1 | Users have collegeId | Field present (nullable) in /me |
| 15.2 | Flags scoped by college | College A vs B see different values |
| 15.3 | Analytics carry collegeId | Persisted in events table |
| 15.4 | tpo role | Allowed in users.role enum |
| 15.5 | outcome_reports table | Columns: userId, collegeId, interviewsAttended, companies, result |
| 15.6 | tpo_views audit | Rows logged per query |

---

## 16 - Observability (6 automated)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| 16.1 | Request ID minted | Any request | Auto-generated x-request-id |
| 16.2 | Request ID echoed | Custom header | Same value returned |
| 16.3 | Malformed ID replaced | Path traversal as ID | Fresh ID generated |
| 16.4 | Error retryable flag | 401 | retryable: false |
| 16.5 | 404 code | Unknown route | NOT_FOUND + retryable: false |
| 16.6 | Domain events | Eval completes | eval_completed logged |

---

## 17 - Content Pipeline Services (6 automated)

| ID | Scenario | Expected |
|----|----------|----------|
| 17.1 | Rubric generation | version: 1, criteria with all fields |
| 17.2 | Model answer | Content returned, cached |
| 17.3 | Follow-up | questionText + weakAreas |
| 17.4 | Coach digest | summary >= 20 chars, highlights, nextFocus |
| 17.5 | Mock reasoning | completeJSON includes reasoning field |
| 17.6 | Object syntax | completeJSON({ system, user }) works |

---

## 18 - Web UI Smoke Tests (Manual)

> Requires: web on :5173, API on :4000

### 18.1 Auth Flow

| ID | Steps | Expected |
|----|-------|----------|
| 18.1.1 | Register new account | Redirect to onboarding |
| 18.1.2 | Complete onboarding | Redirect to dashboard |
| 18.1.3 | Login existing | Dashboard with streak |
| 18.1.4 | Forgot password | Confirmation message |
| 18.1.5 | Reset password | Login works with new password |

### 18.2 Daily Question

| ID | Steps | Expected |
|----|-------|----------|
| 18.2.1 | Load dashboard | Question text, category, difficulty shown |
| 18.2.2 | Type + submit answer | Status -> evaluating, live updates |
| 18.2.3 | View result | Band, feedback, model answer displayed |
| 18.2.4 | Already answered | Previous answer shown |
| 18.2.5 | Streak visible | Counter on dashboard |
| 18.2.6 | Character counter | Updates live while typing |

### 18.3 Practice Mode

| ID | Steps | Expected |
|----|-------|----------|
| 18.3.1 | Navigate to practice | Page loads |
| 18.3.2 | Filter by category | Only selected category |
| 18.3.3 | Submit practice answer | Eval completes, streak unchanged |
| 18.3.4 | Follow-up card | Shows for weak answers |

### 18.4 Voice Mode

| ID | Steps | Expected |
|----|-------|----------|
| 18.4.1 | Toggle to voice | Mic button visible |
| 18.4.2 | Record audio | Timer counts up |
| 18.4.3 | Submit recording | Upload + processing stages shown |
| 18.4.4 | View voice result | Bands + delivery metrics |

### 18.5 History & Leaderboard

| ID | Steps | Expected |
|----|-------|----------|
| 18.5.1 | View history | Past answers with bands + dates |
| 18.5.2 | View answer detail | Full evaluation breakdown |
| 18.5.3 | Leaderboard | Ranked list with scores |
| 18.5.4 | Weekly summary | Stats card on dashboard |

---

## Summary

| Category | Automated | Manual | Total |
|----------|-----------|--------|-------|
| Auth & Onboarding | 13 | 5 | 18 |
| Daily Question | 8 | 6 | 14 |
| Practice Mode | 4 | 4 | 8 |
| Voice Pipeline | 4 | 5 | 9 |
| V2 Evaluation | 5 | 0 | 5 |
| Adaptive & SR | 5 | 3 | 8 |
| Follow-ups & Models | 4 | 0 | 4 |
| Rubric | 3 | 0 | 3 |
| Streaks & Leaderboard | 6 | 0 | 6 |
| Notifications | 7 | 0 | 7 |
| Analytics | 4 | 0 | 4 |
| Feature Flags | 4 | 0 | 4 |
| Labeling Queue | 6 | 4 | 10 |
| TPO Dashboard | 6 | 4 | 10 |
| College Tenancy | 6 | 0 | 6 |
| Observability | 6 | 0 | 6 |
| Content Pipeline | 6 | 0 | 6 |
| **Total** | **97** | **31** | **128** |

### Known Issues

- Pre-existing: `apps/mobile` typecheck fails on `app/index.tsx(18,20)` TS2322 (Expo Router typed-routes). Unrelated to current work.
- Mock provider in test env returns eval-shaped JSON only. Rubric/modelAnswer/followUp services return null gracefully when mock is used.
- Labeling queue UI (post-eval "Was this fair?" prompt) not yet wired into web frontend. API is complete.
- TPO dashboard is API-only. No web UI yet.

### Release Criteria (Build Plan Gates)

| # | Gate | Threshold |
|---|------|-----------|
| 6 | Human-AI band agreement on calibration set | >=85% |
| 7 | Blind re-score band-flip | <=15% |
| 8 | Student "feedback was useful" rating | >=4/5 avg, >=60% responding |
| 9 | TPO engagement | Dashboard logins >=50% of pilot weeks |
