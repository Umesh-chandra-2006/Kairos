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
| API (`apps/api`) | Feature-complete: auth, questions, answers + eval streaming, streaks, leaderboard, notifications, health |
| Web client (`apps/web`) | Feature-complete: auth flows, today/practice/history/streak pages, push card, dark theme |
| Mobile client (`apps/mobile`) | Redesigned UI (instrument-panel design system): Today, Practice, Progress, History, Profile tabs; push wired |
| Database (`packages/db`) | 10-table MySQL 8 schema via Drizzle; migrations + 450+ question seed |
| Deployment | Dockerized production stack (MySQL + Redis + API + Caddy TLS) targeting Oracle Cloud free tier; documented in `deploy/PROVISIONING.md` |
| Tests & CI | API integration suites (auth/core/answers/notifications) run in CI against service containers |
| **v2 pivot (voice-first B2B2C)** | **Strategy only — no code yet.** See §12 |

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
| `routes/` | HTTP layer: auth, questions, answers, streaks, leaderboard, notifications, health |
| `services/` | Business logic (auth, answer, question, streak, stats, notification, leaderboard) |
| `workers/` | Long-running loops: eval worker, notification worker, minute-tick scheduler |
| `queue/` | BullMQ wrapper with an in-process fallback runtime |
| `middleware/` | Auth guard, zod validation, rate limiting, error handler |
| `lib/` | Tokens, passwords, cookies, cache, dates, logger, ids |
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
```

Design properties:

- **Queue resilience**: jobs retry with backoff; a dead-letter cap prevents
  poison-message loops.
- **Model-answer caching**: per-question model answers are generated once and
  cached in Redis (`OPENROUTER_CACHE_TTL_SEC`, default 24h).
- **Graceful degradation**: no API key ⇒ job fails fast with a clear message;
  SSE emits `error` so the UI can render a retry state.
- **Known grading weakness**: single-shot LLM judge, temperature 0.2, one
  1–10 score. Published research puts this design at ±1.2 points of noise and
  ~13.6% pairwise verdict flips. The v2 grading architecture (bands +
  multi-judge + calibration, `kairos-v2-strategy.md` §3.2) exists to replace it.

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

Commands: `pnpm db:generate` (after schema edits), `pnpm db:migrate`,
`pnpm db:seed`.

## 7. API Surface

All routes are mounted under `/api`. Auth-guarded unless noted.

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Liveness + dependency check (no auth) |
| `POST /api/auth/register` | Create account |
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
| `GET /api/questions/practice` | Random practice question (category filter) |
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

Validation is zod-based end to end (shared schemas in `packages/shared`);
errors follow one RFC-ish shape from the central error middleware.

## 8. Clients

### Web (`apps/web`)

React 19 + Vite. Pages: Today (ritual timer), Practice (19-category picker),
History, Streak, Leaderboard, Settings (incl. browser-push card), plus the full
auth/onboarding flow. Error boundaries and network-failure fallbacks on every
route; dark theme; session restored from the HttpOnly cookie via
`GET /api/auth/session`.

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
  integration tests (`auth`, `core`, `answers`, `notifications`) against a
  disposable `kairos_test` database seeded per-suite.
- Tests pin the in-process queue runtime (no Redis dependency) via
  `apps/api/src/test/setup.ts`; set `LOG_LEVEL=silent` to quiet logs.
- CI (`.github/workflows/ci.yml`): typecheck + API tests + production builds on
  push/PR, against MySQL/Redis service containers.

## 11. Project Docs Map

| File | What it is |
| --- | --- |
| `README.md` | Quick start + command cheat sheet |
| `documentation.md` | This manual |
| `kairos_prd.md` | Original product spec (v1, written-answer product) |
| `design.md` | Mobile design system: concept, color/type rules, component inventory |
| `kairos-mobile-screens.html` | Interactive mobile prototype |
| `kairos-flow-diagram.html` | Navigation map |
| `market-research.md` | Formal evidence base for the v2 thesis (Aug 2026) |
| `kairos-v2-strategy.md` | v2 pivot: voice-first B2B2C strategy, MVP scope, kill gates |
| `kairos-v2-pitch.md` | One-page investor narrative |
| `kairos-v2-brutal-research.md` | Adversarial re-review: what survives, what dies, revised numbers |
| `deploy/PROVISIONING.md` | Production host provisioning ($0 Oracle Cloud guide) |

## 12. Roadmap — the v2 Pivot

The v1 app above is complete but its consumer-subscription thesis was retired
by our own research (price-hostile segment, commodity scoring, deadline-driven
churn). The agreed direction is **voice-first, B2B2C**: a daily 90-second
*spoken* answer, honestly graded in bands, sold through college placement cells
at ₹500–1,500/student/season.

State of that track:

1. **Strategy locked** (`kairos-v2-strategy.md`): core loop, honest-grader
   architecture (3 bands, multi-judge, modality-split delivery metrics,
   calibration set + blind re-score), WhatsApp-hybrid distribution, content
   flywheel, 90-day MVP scope with pre-committed kill gates.
2. **Adversarial review done** (`kairos-v2-brutal-research.md`): kills the
   "Duolingo" framing, corrects fundability to Indian seed multiples
   (~$3–5M pre), reprices WhatsApp templates (~₹23+/student/season),
   documents 20+ direct competitors, flags Hinglish ASR as unsolved
   (enforce English-only), and rebuilds kill-gate 5 around college payment
   within 90 days rather than student retention alone.
3. **Code: not started.** No voice capture, ASR, WhatsApp bot, or band-grader
   exists in this repo yet. Next engineering steps when approved, in order:
   - Grading-architecture fix (bands + multi-judge + calibration harness) on
     the existing eval pipeline.
   - Voice intake PWA recorder + English-only enforcement + device-tier
     completion tracking.
   - WhatsApp bot funnel (college broadcast groups, not marketing-template
     pushes) + TPO readiness dashboard.
   - Kill-test instrumentation against the revised gates.

Decision rule carried over from the strategy doc: if the 90-day gates miss,
the spend was <$5k and the thesis retires with data.
