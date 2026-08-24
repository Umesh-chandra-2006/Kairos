# Kairos

AI-powered interview preparation app. Answer one question a day, get a personalized
AI evaluation, and build your streak. Spec: `kairos_prd.md`.

**Status:** v1 (written-answer product) is feature-complete — auth, daily challenge,
practice mode, AI evaluation pipeline, streaks, push/email notifications, leaderboard,
and a production Docker deployment. The voice-first B2B2C pivot (v2) is documented in
`kairos-v2-strategy.md` but not yet implemented. See `documentation.md` for the full
manual and `kairos-v2-brutal-research.md` for the adversarial market review.

Monorepo (pnpm workspaces):

| Package | Path | What it is |
| --- | --- | --- |
| `@kairos/api` | `apps/api` | Express 4 API + async LLM eval queue + SSE streaming |
| `@kairos/web` | `apps/web` | React 19 + Vite web client |
| `@kairos/mobile` | `apps/mobile` | Expo SDK 57 (React Native) mobile client |
| `@kairos/db` | `packages/db` | MySQL 8 + Drizzle ORM schema, migrations, seed |
| `@kairos/shared` | `packages/shared` | Shared zod schemas + constants |
| `@kairos/config` | `packages/config` | Centralized env loading/validation |
| `@kairos/email` | `packages/email` | Resend email client (dry-run in dev) |

## Prerequisites

- Node.js >= 22, pnpm >= 10.4
- Docker (MySQL 8 + Redis 7 via `docker-compose.yml`)
- A `.env` file at the repo root (see `.env.example`)

## Quick start

```bash
# 1. Infrastructure
docker compose up -d

# 2. Environment
cp .env.example .env
#   - set JWT_SECRET (see .env.example for the generator)
#   - optionally set OPENROUTER_API_KEY, RESEND_API_KEY, WEB_PUSH_* keys

# 3. Dependencies
pnpm install

# 4. Database
pnpm db:migrate
pnpm db:seed

# 5. Run API (:4000) + web (:5173)
pnpm dev

# Mobile (separate terminal)
pnpm dev:mobile
```

Ports: API on `4000`, web dev server on `5173` (proxies `/api`), MySQL on
`3307`, Redis on `6380` (remapped in `docker-compose.yml` to avoid conflicts
with other local containers).

## Useful commands

```bash
pnpm typecheck        # all packages
pnpm test             # all packages (runs API integration tests)
pnpm build            # API (CJS bundle) + web production builds
pnpm --filter @kairos/api test        # API integration tests only
pnpm --filter @kairos/api test -- -t "streak"   # single test
pnpm db:generate      # regenerate Drizzle migrations after schema changes
pnpm db:migrate       # apply migrations
pnpm db:seed          # seed questions (450+ curated across 19 categories)
pnpm docker:up / pnpm docker:down

# Production deployment (single VM, Docker Compose + Caddy TLS)
pnpm deploy:prod      # build & start deploy/docker-compose.prod.yml stack
pnpm deploy:logs      # follow API logs
pnpm backup:prod      # MySQL dump to OCI object storage (see deploy/)
```

## Production deployment

The `deploy/` directory contains a self-contained production stack:
`mysql:8.4` + `redis:7` + the API container (which also serves the built web
client) behind `caddy:2` for automatic HTTPS. Target host docs live in
[`deploy/PROVISIONING.md`](deploy/PROVISIONING.md) (Oracle Cloud Always Free
walkthrough, DuckDNS hostname, secrets file, backups). Secrets go in
`deploy/.env` (git-ignored); in production `REDIS_URL`, `OPENROUTER_API_KEY`,
and `RESEND_API_KEY` are validated as required at startup.

## Testing notes

- API integration tests spin up a disposable `kairos_test` database and seed
  their own questions; they need Docker MySQL/Redis running. Start it with
  `pnpm docker:up` — MySQL must be reachable on host port `3307` and Redis on
  `6380` (as mapped in `docker-compose.yml`) before running `pnpm test`.
- `pnpm test` runs every workspace package. `@kairos/shared` and `@kairos/config`
  currently ship no unit tests (their local `vitest.config.ts` just keeps Vitest
  from walking up into an unrelated `vite.config.ts` on the parent drive).
- Tests force the **in-process** queue runtime (no Redis dependency) via
  `apps/api/src/test/setup.ts`.
- Without `OPENROUTER_API_KEY`, evaluation degrades gracefully: answers move to
  `failed` with `errorMessage: "AI evaluation is not configured"` instead of
  hanging. This is the expected behavior in tests and in local dev without a key.
- Set `LOG_LEVEL=silent` (default for tests) to quiet pino output.

## Architecture

Full manual: [`documentation.md`](documentation.md). Summary:

- **Auth**: custom JWT (access 15m) + rotating refresh token (30d). Web uses an
  HttpOnly cookie; mobile sends `{ device: "mobile", refreshToken }` in the body.
  Reused refresh tokens are detected and the token family is revoked.
- **Email verification / password reset**: tokenized links via Resend; dry-run
  logging in dev.
- **Evaluation**: submitting an answer enqueues an eval job (Redis BullMQ, or an
  in-process fallback). The eval worker streams progress over SSE
  (`status` / `token` / `done` / `error` events) and persists the structured
  evaluation. Practice answers stream the same way but never affect streaks.
- **Daily challenge**: a deterministic, community-shared question each day —
  every user gets the exact same question (seeded by date), picked from the
  core technical categories.
- **Practice mode**: 19 categories (core + full-stack, cloud, security, testing,
  DevOps, mobile, ML, agile, product, HR…). Pick a topic and answer unlimited
  random questions with full AI evaluation; practice answers don't count toward
  the daily streak.
- **Streaks**: daily streak with freeze unlocks; a missed day auto-consumes a
  freeze to keep the streak alive (one freeze/week, refilled on read).
- **Notifications**: a minute-tick scheduler enqueues daily reminders
  (matched to each user's local `reminderTime`) into a reliable outbox table and
  drains it to Expo push / web push / email with retries and a dead-letter cap.
  Every Monday it also sends a weekly re-engagement email: questions answered,
  average score, and weakest category for the previous week.

## Mobile design system

The mobile app follows the instrument-panel design language in
[`design.md`](design.md): one signature "moment ring" motif reused across Home /
Evaluation / Progress, amber = doing today's thing, teal = the system analyzing
your work, mono type for everything numeric. Five tabs: Today, Practice,
Progress, History, Profile. Interactive prototype: `kairos-mobile-screens.html`;
navigation map: `kairos-flow-diagram.html`.

## Push notifications

Push is wired end-to-end on both clients; the server delivers via an outbox
(Expo push for mobile, Web Push VAPID for browser). To actually receive
notifications you need two things configured:

1. **Web (VAPID keys)** — set `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY`
   in `.env` (generate with the command in `.env.example`). The browser then
   shows an "Enable browser notifications" button in **Settings** (web) /
   **Profile** (mobile); it registers a service worker
   (`apps/web/public/sw.js`) and posts the subscription to
   `POST /api/notifications/push-subscriptions`. Without keys, the card reports
   "not configured" and delivery dry-runs.
2. **Mobile (Expo push)** — set `EXPO_PUBLIC_EAS_PROJECT_ID` to your EAS
   project ID. The **Profile** tab shows "Enable push notifications", which
   requests permission, gets an Expo push token, and registers it with the API.
   Without a project ID the button explains what to set.

Both clients list/remove subscriptions on logout via
`GET /api/notifications/subscriptions`.

## CI

`.github/workflows/ci.yml` runs typecheck, API tests, and production builds on
push/PR against service containers (MySQL + Redis).
