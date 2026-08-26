# Kairos Documentation

The project manual: what Kairos is, how it is built, how to run it, and where it
is going. For quick setup see [`README.md`](README.md); for product rationale
see the docs map in §11.

---

## 1. What Kairos Is

Kairos is an AI-powered interview-preparation app built around one mechanic:
**one question a day**. A user answers a deterministic, community-shared daily
challenge (or unlimited practice questions across 19 categories), an LLM grades
the answer against a rubric, and the result feeds a streak, a skill profile,
and a leaderboard.

- **Daily challenge** — every user on a given date gets the exact same question,
  seeded deterministically from the date, drawn from core technical categories.
  This makes the challenge a shared ritual (and makes leaderboards fair).
- **Practice mode** — pick any of 19 categories and answer unlimited random
  questions with full AI evaluation; practice answers never affect streaks.
- **AI evaluation** — structured scoring streamed live over SSE, plus a cached
  model answer for every question.
- **Habit machinery** — streaks with weekly freezes, scheduled reminders
  (Expo push / Web Push / email), and a Monday re-engagement email.

### Current status

| Track | Status |
| --- | --- |
| API (`apps/api`) | Feature-complete: auth, questions, answers + eval streaming, streaks, leaderboard, notifications, voice evaluation, skills scoring, adaptive engine, Razorpay billing, referral system, GDPR, Sentry, observability |
| Web client (`apps/web`) | Feature-complete: auth flows, today/practice/history/streak/skills/billing/referral pages, PWA (manifest + SW + offline), landing page, onboarding v2, share card, mobile responsive (hamburger nav), Turnstile CAPTCHA, granular consent |
| Mobile client (`apps/mobile`) | Redesigned UI (instrument-panel design system): Today, Practice, Progress, History, Profile tabs; push wired |
| Database (`packages/db`) | 22-table MySQL 8 schema via Drizzle; 14 migrations + 450+ question seed |
| Deployment | Dockerized production stack (MySQL + Redis + API + Caddy TLS) targeting Oracle Cloud free tier; documented in `deploy/PROVISIONING.md` |
| Tests & CI | 170 automated tests (API integration + service units) + 62 manual API tests; CI on push/PR |
| **B2C launch** | **Complete.** All 17 pre-launch items built and tested. CONDITIONAL GO verdict. |

---

## 2. Repository Layout

```
kairos/
├── apps/
│   ├── api/        Express 4 API: routes, services, workers, queue, SSE
│   ├── web/        React 19 + Vite client (served by the API in production)
│   └── mobile/     Expo SDK 57 (React Native) client
├── packages/
│   ├── db/         Drizzle ORM schema, migrations, seed data
│   ├── shared/     Zod schemas + constants shared by api/web/mobile
│   ├── config/     Env loading + zod validation (@kairos/config)
│   └── email/      Resend client (dry-run logging in dev)
├── deploy/         Production stack: compose file, Caddyfile, backup script, provisioning guide
├── docker-compose.yml       Dev infra: MySQL (:3307) + Redis (:6380)
├── Dockerfile               Multi-stage production image for the API
└── kairos_prd.md            Original product spec
```

Key source directories inside `apps/api/src`:

| Path | Responsibility |
| --- | --- |
| `routes/` | HTTP layer: auth, questions, answers, streaks, leaderboard, notifications, billing, referral, skills, health, flags, TPO, analytics, account |
| `services/` | Business logic (auth, answer, question, streak, stats, notification, leaderboard, subscription, referral, skillScoring, adaptive, spacedRepetition, evaluator) |
| `workers/` | Long-running loops: eval worker, notification worker, minute-tick scheduler |
| `queue/` | BullMQ wrapper with an in-process fallback runtime |
| `middleware/` | Auth guard, zod validation, rate limiting (general/auth/AI/registration), error handler, usage limits |
| `lib/` | Tokens, passwords, cookies, cache, dates, logger, ids, Sentry, observability metrics |
| `test/` | Vitest integration suites + disposable-database harness |

---

## 3. Getting Started (Development)

Prerequisites: Node.js >= 22, pnpm >= 10.4, Docker.

```bash
docker compose up -d          # MySQL on host port 3307, Redis on 6380
cp .env.example .env          # set JWT_SECRET at minimum
pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev                      # API :4000 + web :5173
pnpm dev:mobile               # Expo dev server (separate terminal)
```

Notes:

- The web dev server proxies `/api` to `localhost:4000`.
- Mobile needs `EXPO_PUBLIC_API_URL` pointing at your machine's LAN IP
  (device) or `http://10.0.2.2:4000` (Android emulator).
- Without `OPENROUTER_API_KEY`, evaluations degrade gracefully: answers move to
  `failed` with `"AI evaluation is not configured"` instead of hanging.
- Emails are dry-run logged unless `RESEND_API_KEY` is set.

## 4. Configuration Reference

All configuration loads from the repo-root `.env` via `@kairos/config`
(zod-validated; unknown-but-tolerated unless noted). In `NODE_ENV=production`,
`REDIS_URL`, `OPENROUTER_API_KEY`, and `RESEND_API_KEY` are **required** —
startup fails fast without them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `mysql://kairos:kairos@localhost:3307/kairos` | MySQL connection |
| `REDIS_URL` | `redis://localhost:6380` | Queue + cache; optional in dev (in-process fallback), required in prod |
| `JWT_SECRET` | — (must set) | Signing key for access/refresh tokens |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `30d` | Token lifetimes |
| `OPENROUTER_API_KEY` | — | LLM evaluation via OpenRouter |
| `OPENROUTER_MODEL` / `OPENROUTER_FAST_MODEL` | `meta-llama/llama-3.1-8b-instruct:free` | Grading / model-answer models |
| `OPENROUTER_TIMEOUT_MS` / `OPENROUTER_CACHE_TTL_SEC` | `30000` / `86400` | Request timeout; model-answer cache TTL |
| `RESEND_API_KEY` / `EMAIL_FROM` | — / `Kairos <onboarding@resend.dev>` | Transactional email |
| `APP_URL` | `http://localhost:5173` | Public base URL used in email links |
| `PORT` / `CORS_ORIGINS` | `4000` / `http://localhost:5173` | API bind port + allowed origins |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `RATE_LIMIT_AUTH_MAX` | `60000` / `100` / `10` | Rate limiting |
| `RAZORPAY_KEY_ID` | — | Razorpay API key for billing |
| `RAZORPAY_KEY_SECRET` | — | Razorpay API secret |
| `RAZORPAY_PLAN_ID` | — | Razorpay plan ID for Pro subscription |
| `RAZORPAY_WEBHOOK_SECRET` | — | Razorpay webhook signing secret |
| `SENTRY_DSN` | — | Sentry DSN for API error tracking |
| `VITE_SENTRY_DSN` | — | Sentry DSN for web error tracking |
| `TURNSTILE_SECRET_KEY` | — | Cloudflare Turnstile secret (CAPTCHA) |
| `VITE_TURNSTILE_SITEKEY` | — | Cloudflare Turnstile site key |
| `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` / `WEB_PUSH_SUBJECT` | — | VAPID keys for browser push |
| `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_EAS_PROJECT_ID` | — | Mobile build-time config (VITE/Expo public env) |

## 5. Architecture

### 5.1 Auth

Custom JWT implementation — no auth library:

- **Access token**: JWT, 15-minute TTL. Web stores it in an HttpOnly cookie;
  mobile keeps it in secure storage and sends `{ device: "mobile", refreshToken }`
  on refresh.
- **Refresh token rotation**: opaque 30-day tokens persisted server-side
  (`refresh_tokens`). Each token belongs to a *family*; reuse of a rotated
  token revokes the entire family (stolen-token defense).
- **Email verification & password reset**: single-use tokens in `email_tokens`,
  delivered as Resend links; dev mode logs them.
- Passwords hashed with argon2id; login/register/forgot/reset are rate-limited
  separately (`RATE_LIMIT_AUTH_MAX`).

### 5.2 Evaluation pipeline

```
POST /api/answers/submit (or /practice)
  → answer row created (status=pending)
  → eval job enqueued (BullMQ on Redis, or in-process fallback when REDIS_URL unset)
  → client opens GET /api/answers/:id/stream (SSE)
Eval worker (apps/api/src/workers/evalWorker.ts)
  → fetches question + rubric, calls OpenRouter (grading model)
  → streams progress events over SSE: status → token* → done | error
  → persists structured evaluation JSON + score; records streak activity
    (challenge answers only; practice never touches streaks)
  → updates skill profile (10-dimension EMA scoring)
  → checks adaptive difficulty for follow-up questions
  → records spaced repetition review schedule (SM-2)
```

Design properties:

- **Queue resilience**: jobs retry with backoff; a dead-letter cap prevents
  poison-message loops.
- **Model-answer caching**: per-question model answers are generated once and
  cached in Redis (`OPENROUTER_CACHE_TTL_SEC`, default 24h).
- **Graceful degradation**: no API key ⇒ job fails fast with a clear message;
  SSE emits `error` so the UI can render a retry state.
- **V2 evaluator**: structured rubric-based scoring across 3 dimensions
  (content, structure, delivery), 3 bands (needs_work, solid, strong).
- **Band-flip harness**: benchmark re-scoring tool for QA (6 fixtures,
  pass criteria: ≤15% flip rate, zero critical flips).
- **Skill scoring**: 10-dimension EMA scoring updated on each evaluation.
- **Adaptive difficulty**: targets weakest skill areas, adjusts question
  selection based on skill profile.
- **Spaced repetition**: SM-2 algorithm schedules review of missed concepts.

### 5.3 Daily challenge

A deterministic function of the date picks one question per day from the core
technical categories. Every user gets the same question on the same day
(`daily_assignments` records who answered what). Consequences:

- Fair same-day leaderboards; shared community ritual.
- The question is not secret — the value is doing it under a timer, which is
  also why the v2 content strategy treats leakage as non-fatal.

### 5.4 Streaks

`streaks` tracks current/longest streak and freeze inventory. A missed day
auto-consumes one freeze (max one per week, refilled lazily on read) before
breaking the streak — forgiveness over guilt.

### 5.5 Notifications

Reliable outbox pattern (`notification_outbox`):

1. A minute-tick scheduler enqueues due reminders matched to each user's local
   `reminderTime` (stored in `notification_prefs`).
2. The notification worker drains the outbox: Expo push (mobile tokens),
   Web Push VAPID (browser subscriptions in `push_subscriptions`), or email.
3. Retries escalate; beyond the cap rows land in dead-letter state.
4. Mondays additionally send a weekly summary email: questions answered,
   average score, weakest category (same payload powers the in-app panel).

### 5.6 Leaderboard

Aggregated from daily-challenge answer scores; endpoints return the board plus
the caller's rank (`GET /api/leaderboard/me/rank`).

## 6. Database Schema (MySQL 8, Drizzle)

| Table | Purpose |
| --- | --- |
| `users` | Account, email verification state, onboarding target companies/categories |
| `refresh_tokens` | Rotating refresh-token families (device-tagged) |
| `email_tokens` | Verify-email / reset-password one-time tokens |
| `questions` | 450+ seeded questions: category, difficulty, prompt, rubric, model answer |
| `answers` | User answers: challenge vs practice, status, score, evaluation JSON |
| `streaks` | Current/longest streak, freeze count, last activity date |
| `daily_assignments` | Per-user-per-date link between the daily question and an answer |
| `push_subscriptions` | Expo tokens / Web Push subscriptions |
| `notification_prefs` | Reminder time, channel opt-ins |
| `notification_outbox` | Durable outbox for all outbound notifications |
| `subscriptions` | Razorpay subscription state: plan, status, period dates, payment IDs |
| `usage_tracking` | Per-user-per-date evaluation + voice usage counters |
| `skill_evidence` | Individual evaluation records feeding the skill engine |
| `user_skill_state` | EMA-smoothed skill scores per dimension per user |
| `consent_log` | GDPR consent audit trail (timestamped accept/decline) |
| `data_deletions` | GDPR deletion requests + processing state |
| `spaced_reviews` | SM-2 spaced repetition schedule per user per question |
| `band_confirmations` | QA band-flip confirmation records |
| `outcome_reports` | B2B2C outcome self-reports (deferred) |
| `referral_codes` | User referral codes with usage counts |
| `referral_events` | Referral application records + reward tracking |
| `feature_flags` | Per-environment, per-college feature flag overrides |

Commands: `pnpm db:generate` (after schema edits), `pnpm db:migrate`,
`pnpm db:seed`.

## 7. API Surface

All routes are mounted under `/api`. Auth-guarded unless noted.

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Liveness + dependency check (no auth) |
| `GET /api/health/metrics` | API latency, worker metrics, LLM cost (no auth) |
| `POST /api/auth/register` | Create account (Turnstile CAPTCHA + honeypot) |
| `POST /api/auth/login` | Login (sets web cookie or returns mobile body) |
| `POST /api/auth/refresh` | Rotate refresh token → new access token |
| `POST /api/auth/logout` | Revoke current session |
| `POST /api/auth/verify-email` | Consume verification token |
| `POST /api/auth/forgot-password` | Issue reset email |
| `POST /api/auth/reset-password` | Consume reset token |
| `PUT /api/auth/change-password` | Authenticated password change |
| `PUT /api/auth/me/onboarding` | Save onboarding preferences |
| `GET /api/auth/me` | Current profile |
| `GET /api/auth/session` | Session introspection (web bootstrapping) |
| `GET /api/questions/today` | Today's deterministic challenge |
| `GET /api/questions/practice` | Random practice question (category filter, adaptive) |
| `GET /api/questions` | Browse/filter the bank |
| `POST /api/answers/submit` | Submit challenge answer → enqueue eval |
| `POST /api/answers/practice` | Submit practice answer → enqueue eval |
| `GET /api/answers/:id/stream` | SSE evaluation stream (`status`/`token`/`done`/`error`) |
| `GET /api/answers/:id` | Answer detail incl. persisted evaluation |
| `GET /api/answers` | History (paged) |
| `GET /api/answers/weekly-summary` | Last Mon–Sun stats panel |
| `GET /api/streak` | Streak state (lazy refill on read) |
| `POST /api/streak/refill` | Explicit freeze refill |
| `GET /api/leaderboard` | Daily-challenge leaderboard |
| `GET /api/leaderboard/me/rank` | Caller's rank |
| `GET/PUT /api/notifications/prefs` | Reminder time + channel prefs |
| `GET /api/notifications/vapid-public-key` | Browser push bootstrap (no auth) |
| `GET /api/notifications/subscriptions` | List my push subscriptions |
| `POST /api/notifications/push-subscriptions` | Register Expo/Web-Push subscription |
| `DELETE /api/notifications/push-subscriptions` | Remove a subscription |
| `GET /api/billing/plans` | List available plans |
| `POST /api/billing/checkout` | Create Razorpay checkout session |
| `POST /api/billing/cancel` | Cancel subscription |
| `GET /api/referral` | Get referral code + stats |
| `POST /api/referral/apply` | Apply a referral code |
| `GET /api/skills/profile` | Skill radar profile |
| `GET /api/skills/daily-questions` | Category-specific daily questions |
| `GET /api/skills/weak` | Weak skill areas |
| `GET /api/account/export` | GDPR data export (JSON) |
| `POST /api/account/delete` | GDPR account deletion |
| `POST /api/account/consent` | Record GDPR consent |
| `GET /api/account/stats` | Account statistics |
| `POST /api/analytics/events` | Funnel event logging |
| `GET /api/flags` | Feature flags |

Validation is zod-based end to end (shared schemas in `packages/shared`);
errors follow one RFC-ish shape from the central error middleware.

## 8. Clients

### Web (`apps/web`)

React 19 + Vite. Pages: Today (ritual timer), Practice (19-category picker),
Skills (radar chart + trend), History, Streak, Leaderboard, Settings (push card,
password change, GDPR export/delete), Billing (Razorpay plans), Referral (invite
friends). Error boundaries and network-failure fallbacks on every route; dark
theme; session restored from the HttpOnly cookie via `GET /api/auth/session`.

PWA: installable on iOS/Android/desktop via `manifest.json`, service worker with
cache-first static assets and network-first API, offline fallback page, versioned
cache names for automatic updates.

Landing page: marketing page with hero, features, pricing, and footer with legal
links. Accessible to unauthenticated users at `/`.

Auth flows: login, register (with Turnstile CAPTCHA + honeypot + ToS checkbox),
forgot/reset password, email verification (enforced via `VerifyEmailGate`).

Onboarding: 4-step wizard (Welcome → Goal → Level → Topics) with skip option.

Mobile responsive: hamburger nav at ≤768px, 44px minimum touch targets,
responsive breakpoints at 768px and 480px.

### Mobile (`apps/mobile`)

Expo SDK 57. Five tabs — **Today, Practice, Progress, History, Profile** —
with pushed (tab-bar-less) screens for auth, onboarding, answering, and
evaluation. Recent redesign introduced the instrument-panel design system:

- **Signature motif**: one circular "moment ring" reused three ways — amber
  time-to-reset ring on Today, teal score ring on Evaluation, teal skill-radar
  polygon on Progress.
- **Color discipline**: amber = doing today's thing; teal = the system
  analyzing your work; danger = weak scores. One accent leads per screen.
- **Typography**: Space Grotesk display, Inter body, IBM Plex Mono for every
  numeric/time-bound element.
- Components: `Card`, `MomentRing`, `SkillRadar`, `Heatmap`, `ScoreChip`,
  `Pill`, `Eyebrow`, themed `Button`/`Field`/`Screen`.

Source of truth: [`design.md`](design.md). Interactive prototype:
`kairos-mobile-screens.html`; navigation map: `kairos-flow-diagram.html`.

Push registration lives in Profile → "Enable push notifications" (needs
`EXPO_PUBLIC_EAS_PROJECT_ID`).

## 9. Production Deployment

Single-VM Docker stack defined in `deploy/docker-compose.prod.yml`:

```
caddy:2 (80/443, auto-TLS) ──► api (Dockerfile build, serves web dist too)
        │
mysql:8.4 ── volume mysql_data      redis:7 (AOF) ── volume redis_data
```

- Secrets live in `deploy/.env` (git-ignored, chmod 600): `MYSQL_*`, `APP_URL`,
  `JWT_SECRET`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, optional `WEB_PUSH_*`.
- Caddy terminates TLS automatically (DuckDNS hostname walkthrough in
  [`deploy/PROVISIONING.md`](deploy/PROVISIONING.md), sized for Oracle Cloud's
  Always Free ARM VM).
- Commands: `pnpm deploy:prod` (build + up), `pnpm deploy:logs`,
  `pnpm backup:prod` (`deploy/backup.sh`, MySQL dump to OCI object storage).
- Production startup validates required env (`REDIS_URL`,
  `OPENROUTER_API_KEY`, `RESEND_API_KEY`) and exits fast if missing.
- The API bundle is CommonJS (`dist/index.cjs`, esbuild, Node 22 target);
  `@kairos/config` resolves the workspace root without `import.meta` so the
  bundled binary finds `.env`/migrations regardless of cwd.

## 10. Testing & CI

- `pnpm test` runs each workspace's suite; the meaningful coverage is the API's
  170 integration and unit tests against a disposable `kairos_test` database.
- Test files cover: auth, core, answers, notifications, band confirmation,
  TPO dashboard, authorization, voice submissions, content pipeline,
  band-flip harness, skill scoring, adaptive engine, delivery metrics,
  evaluator v2, feature flags, providers, spaced repetition, eval worker,
  analytics, observability, language detection.
- Tests pin the in-process queue runtime (no Redis dependency) via
  `apps/api/src/test/setup.ts`; set `LOG_LEVEL=silent` to quiet logs.
- CI (`.github/workflows/ci.yml`): typecheck + API tests + production builds on
  push/PR, against MySQL/Redis service containers.
- QA report: see `QA_REPORT.md` for full automated + manual test results.

## 11. Project Docs Map

| File | What it is |
| --- | --- |
| `README.md` | Quick start + command cheat sheet |
| `documentation.md` | This manual |
| `TESTING_PLAN.md` | QA testing plan (201 scenarios, 170 automated) |
| `QA_REPORT.md` | Final QA report (automated + manual + B2C readiness) |
| `kairos_prd.md` | Original product spec (v1, written-answer product) |
| `design.md` | Mobile design system: concept, color/type rules, component inventory |
| `kairos-mobile-screens.html` | Interactive mobile prototype |
| `kairos-flow-diagram.html` | Navigation map |
| `market-research.md` | Formal evidence base for the v2 thesis (Aug 2026) |
| `kairos-v2-strategy.md` | v2 pivot: voice-first B2B2C strategy, MVP scope, kill gates |
| `kairos-v2-pitch.md` | One-page investor narrative |
| `kairos-v2-brutal-research.md` | Adversarial re-review: what survives, what dies, revised numbers |
| `kairos-v2-build-plan.md` | Authoritative build plan for all phases |
| `deploy/PROVISIONING.md` | Production host provisioning ($0 Oracle Cloud guide) |

## 12. Roadmap — the v2 Pivot

The v1 app was complete but its consumer-subscription thesis was retired
by our own research (price-hostile segment, commodity scoring, deadline-driven
churn). The agreed direction was **voice-first, B2C-first**: a daily 90-second
*spoken* answer, honestly graded in bands, with B2B2C (college placement cells)
added later.

### v2 build complete (Phase 0–3 + launch hardening)

All planned features for B2C launch are built and tested:

- **Phase 0:** Evaluation contract, provider abstractions, migration, atomic
  worker claim, feature flags, analytics events, request-id correlation.
- **Phase 1:** Voice pipeline (audio storage, ASR providers, delivery metrics,
  V2 evaluator, voice submission API, web recorder, Speak mode).
- **Phase 2:** Question pool cache, adaptive difficulty engine, spaced
  repetition (SM-2).
- **Phase 3:** Rubric schema, improved judge prompts, model answer generator,
  follow-up questions, weekly coach digest.
- **Wave 2:** TPO dashboard endpoints (activation, improvement, weak-skills,
  intervention, readiness-trend, calibration).
- **Launch hardening:** Razorpay billing, GDPR (export/delete/consent),
  skill profile radar chart, PWA (manifest + SW + offline), landing page,
  onboarding v2, share card, referral system, legal pages (ToS + Privacy),
  mobile responsive design, Sentry error tracking, Cloudflare Turnstile CAPTCHA,
  email verification enforcement, granular consent toggles, honeypot CAPTCHA.

### Deferred (Wave 4 — college/B2B2C)

| Item | Notes |
|---|---|
| TPO dashboard UI | 6 endpoints built but gated behind requireTpoAuth |
| College management | collegeId scoping exists, no admin UI |
| Outcome self-reporting | Table exists, no student-facing form |
| Control group / A/B | Not started |
| WhatsApp reminders | Deferred (cost + compliance concerns) |
| Multi-role RBAC | Placeholder only (user/admin/tpo enums) |
