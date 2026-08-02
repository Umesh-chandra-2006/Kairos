# Kairos

AI-powered interview preparation app. Answer one question a day, get a personalized
AI evaluation, and build your streak. Spec: `kairos_prd.md`.

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
pnpm build            # all packages
pnpm --filter @kairos/api test        # API integration tests only
pnpm --filter @kairos/api test -- -t "streak"   # single test
pnpm db:generate      # regenerate Drizzle migrations after schema changes
pnpm db:migrate       # apply migrations
pnpm db:seed          # seed questions (450+ curated across 19 categories)
pnpm docker:up / pnpm docker:down
```

## Testing notes

- API integration tests spin up a disposable `kairos_test` database and seed
  their own questions; they need Docker MySQL/Redis running.
- Tests force the **in-process** queue runtime (no Redis dependency) via
  `apps/api/src/test/setup.ts`.
- Without `OPENROUTER_API_KEY`, evaluation degrades gracefully: answers move to
  `failed` with `errorMessage: "AI evaluation is not configured"` instead of
  hanging. This is the expected behavior in tests and in local dev without a key.
- Set `LOG_LEVEL=silent` (default for tests) to quiet pino output.

## Architecture

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
- **Leaderboard**: aggregated from daily answer scores with the caller's rank.

## Push notifications

Push is wired end-to-end on both clients; the server delivers via an outbox
(Expo push for mobile, Web Push VAPID for browser). To actually receive
notifications you need two things configured:

1. **Web (VAPID keys)** — set `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY`
   in `.env` (generate with the command in `.env.example`). The browser then
   shows an "Enable browser notifications" button in **Settings**; it registers
   a service worker (`apps/web/public/sw.js`) and posts the subscription to
   `POST /api/notifications/push-subscriptions`. Without keys, the card reports
   "not configured" and delivery dry-runs.
2. **Mobile (Expo push)** — set `EXPO_PUBLIC_EAS_PROJECT_ID` to your EAS
   project ID. The **Settings** tab shows "Enable push notifications", which
   requests permission, gets an Expo push token, and registers it with the API.
   Without a project ID the button explains what to set.

Both clients list/remove subscriptions on logout via
`GET /api/notifications/subscriptions`.

## CI

`.github/workflows/ci.yml` runs typecheck, API tests, and production builds on
push/PR against service containers (MySQL + Redis).
