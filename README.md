# Kairos — AI Interview Preparation Platform

> Voice-first, adaptive interview training that builds real confidence.

Kairos helps job seekers prepare for technical interviews through daily spoken
practice, AI-powered evaluation across 10 skill dimensions, adaptive question
selection targeting your weakest areas, and progressive skill tracking over time.

**Status:** Production-ready for B2C launch. Voice evaluation, adaptive engine,
skills taxonomy, Razorpay billing, GDPR compliance, PWA, referral system, and
observability are all built and tested.

---

## What's built

### Core product
- **Daily challenge** — one question per day, same for all users, from 19 categories
- **Practice mode** — pick a topic, answer unlimited questions with full AI evaluation
- **Voice mode** — record spoken answers, get ASR transcript + content/structure/delivery evaluation
- **AI evaluation** — structured rubric-based scoring across 3 dimensions (content, structure, delivery), 3 bands (needs_work, solid, strong)
- **Adaptive engine** — targets weakest skill areas, uses spaced repetition (SM-2)
- **Skills taxonomy** — 10 dimensions tracked with EMA: technical_explanation, structure, conciseness, relevance, clarity, fluency, composure, domain_depth, conclusion_strength, delivery_quality
- **Skill profile** — radar chart visualization, trend detection (improving/stable/declining), weakness drilldown
- **Follow-up questions** — AI-generated questions targeting weak areas from last answer

### Engagement
- **Streaks** — daily streak with freeze mechanics
- **Leaderboard** — top-20 rankings + personal rank
- **Notifications** — web push, email (weekly digest), configurable reminders
- **Referral system** — invite friends, earn free Pro days (7 days referrer, 3 days referred)
- **Share card** — social proof card with streak + skills for Twitter/LinkedIn

### Subscription & billing
- **Free tier** — 3 evaluations/day, 10 voice minutes/day
- **Pro tier** — unlimited (₹9.99/month via Razorpay)
- **Checkout flow** — Razorpay subscription link → webhook → plan activation
- **Usage tracking** — per-plan daily quotas enforced at API middleware level

### B2C launch features
- **PWA** — installable on iOS/Android/desktop, offline fallback, service worker caching
- **Landing page** — marketing page with features, pricing, and CTAs
- **Onboarding v2** — 4-step wizard (Welcome → Goal → Level → Topics)
- **Legal pages** — Terms of Service + Privacy Policy at `/terms` and `/privacy`
- **Consent banner** — granular toggles (essential/analytics/marketing) with GDPR logging
- **Email verification** — enforced via `VerifyEmailGate` on protected routes
- **Turnstile CAPTCHA** — Cloudflare Turnstile on registration (honeypot as fallback)
- **Mobile responsive** — hamburger nav, 44px touch targets, responsive breakpoints

### Compliance
- **GDPR** — data export (full JSON download), account deletion (anonymize + async erase), consent logging
- **Cookie consent** — granular banner with accept/decline/save custom, logged to consent_log table
- **Recording lifecycle** — audio stored with configurable retention, auto-deletion

### Security
- **Sentry** — error tracking on API (`@sentry/node`) + Web (`@sentry/react`)
- **JWT auth** — HS256, 15min access, refresh rotation via HttpOnly cookies
- **Rate limiting** — 3 tiers: general (100/min), auth (10/min), AI (10/min), registration (20/min IP-only)
- **Honeypot CAPTCHA** — hidden fields on registration to trap bots

### Infrastructure
- **Observability** — API latency tracking, worker eval metrics, LLM cost estimation, `GET /health/metrics`
- **Band-flip harness** — benchmark re-scoring tool for quality assurance (6 fixtures, pass criteria: ≤15% flip rate, zero critical flips)

### Web app
- React 19 + Vite + React Router v6
- Light/dark theme
- Mobile responsive design (hamburger nav, 44px touch targets)
- Error boundaries on all interactive pages (Sentry integration)
- Mic permission handling with clear error messages
- PWA: installable, offline fallback, service worker

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Web (SPA) │────▶│  Express API │────▶│  MySQL 8.4  │
│  React 19   │     │  Port 4000   │     │  Port 3307  │
│  PWA + SW   │     │  Sentry      │     │             │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐     ┌─────────────┐
                    │  BullMQ /    │────▶│  Redis 7    │
                    │  In-Process  │     │  Port 6380  │
                    └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │  Eval Worker │
                    │  (ASR + LLM) │
                    └──────────────┘
```

### Monorepo packages

| Package | Path | Purpose |
|---|---|---|
| `@kairos/api` | `apps/api` | Express 4 API, async eval queue, SSE streaming |
| `@kairos/web` | `apps/web` | React 19 + Vite web client (PWA) |
| `@kairos/mobile` | `apps/mobile` | Expo SDK (React Native) mobile client |
| `@kairos/db` | `packages/db` | MySQL 8 + Drizzle ORM schema, 14 migrations |
| `@kairos/shared` | `packages/shared` | Shared zod schemas + constants |
| `@kairos/config` | `packages/config` | Centralized env loading/validation |
| `@kairos/email` | `packages/email` | Resend email client (dry-run in dev) |

### API endpoints (42 total)

| Domain | Endpoints |
|---|---|
| Auth | register, login, refresh, logout, verify-email, forgot-password, reset-password, change-password, onboarding, me, session |
| Questions | today, practice, list, model-answer |
| Answers | submit, practice, history, weekly-summary, detail, follow-up, confirm, stream |
| Voice | submit-voice, evaluation, evaluation-stream |
| Skills | profile, weak |
| Streak | get, refill |
| Leaderboard | top-20, my-rank |
| Billing | plans, checkout, cancel |
| Referral | stats, apply |
| Account | export, delete, consent, stats |
| Notifications | prefs, vapid-key, subscriptions, push-subscribe, push-unsubscribe |
| Analytics | batch-ingest |
| Health | health, metrics |
| Flags | feature-flags |
| TPO | activation, improvement, weak-skills, intervention, readiness-trend, calibration |

---

## Quick start

```bash
# 1. Infrastructure
docker compose up -d

# 2. Environment
cp .env.example .env
# Required: JWT_SECRET (32+ chars)
# Optional: OPENROUTER_API_KEY, RESEND_API_KEY, RAZORPAY_KEY_ID

# 3. Dependencies
pnpm install

# 4. Database (14 migrations)
pnpm db:migrate
pnpm db:seed

# 5. Run API (:4000) + web (:5173)
pnpm dev
```

### Ports

| Service | Port | Notes |
|---|---|---|
| API | 4000 | Express + SSE |
| Web | 5173 | Vite dev server |
| MySQL | 3307 | Remapped from 3306 |
| Redis | 6380 | Remapped from 6379 |

### Useful commands

```bash
pnpm typecheck                              # all packages
pnpm test                                   # all packages
pnpm --filter @kairos/api test              # API tests only
pnpm --filter @kairos/api test -- -t "streak"  # single test
pnpm db:generate                            # regenerate migrations
pnpm db:migrate                             # apply migrations
pnpm db:seed                                # seed 450+ questions
pnpm build                                  # production builds
pnpm deploy:prod                            # Docker Compose prod stack
```

---

## Environment variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | 32+ character secret for JWT signing |

### Optional (production-required)

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection (required in prod for BullMQ) |
| `OPENROUTER_API_KEY` | LLM provider key (required for AI evaluation) |
| `RESEND_API_KEY` | Email provider key (required for transactional email) |
| `RAZORPAY_KEY_ID` | Razorpay API key (required for billing) |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret |
| `RAZORPAY_PLAN_ID` | Razorpay plan ID for Pro subscription |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret |

### Feature toggles

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `auto` | `auto`, `openrouter`, or `mock` |
| `ASR_PROVIDER` | `auto` | `auto`, `localwhisper`, `groq`, or `mock` |
| `WEB_PUSH_PUBLIC_KEY` | — | VAPID public key for web push |
| `WEB_PUSH_PRIVATE_KEY` | — | VAPID private key for web push |
| `SENTRY_DSN` | — | Sentry DSN for API error tracking |
| `VITE_SENTRY_DSN` | — | Sentry DSN for web error tracking |
| `TURNSTILE_SECRET_KEY` | — | Cloudflare Turnstile secret (CAPTCHA) |
| `VITE_TURNSTILE_SITEKEY` | — | Cloudflare Turnstile site key |

---

## Testing

```bash
# Run all tests (170+)
pnpm test

# API integration tests (needs Docker MySQL + Redis)
pnpm --filter @kairos/api test

# Single test file
pnpm --filter @kairos/api test -- -t "skillScoring"
```

- Tests use a disposable `kairos_test` database (drop + recreate per run)
- In-process queue runtime (no Redis dependency in tests)
- Without `OPENROUTER_API_KEY`, evaluation gracefully degrades to "AI evaluation is not configured"
- `LOG_LEVEL=silent` suppresses pino output in tests

---

## Production deployment

The `deploy/` directory contains a self-contained production stack:
`mysql:8.4` + `redis:7` + API (serves built web client) + `caddy:2` for TLS.

See [`deploy/PROVISIONING.md`](deploy/PROVISIONING.md) for:
- Oracle Cloud Always Free walkthrough
- DuckDNS hostname setup
- Secrets file configuration
- Backup procedures

---

## What's left to build

### Pre-launch checklist (DONE)

| Item | Status |
|---|---|
| Payment/subscription (Razorpay) | ✅ Built |
| Onboarding flow (4-step wizard) | ✅ Built |
| Email verification (enforced) | ✅ Built |
| Password reset | ✅ Built |
| Skill profile UI (radar chart) | ✅ Built |
| GDPR data export + deletion | ✅ Built |
| Consent logging (granular) | ✅ Built |
| Voice UI hardening | ✅ Built |
| Usage limits | ✅ Built |
| Observability | ✅ Built |
| PWA (manifest + SW + offline) | ✅ Built |
| Landing page | ✅ Built |
| Legal pages (ToS + Privacy) | ✅ Built |
| Referral system | ✅ Built |
| CAPTCHA (Turnstile + honeypot) | ✅ Built |
| Sentry error tracking | ✅ Built |
| Mobile responsive design | ✅ Built |

### Post-launch polish

| Item | Notes |
|---|---|
| Email templates | Current: plain text; can add branded HTML |
| Load testing | Recommended before >100 concurrent users |
| Mobile testing | Expo app exists but untested on real devices |

### Deferred (Wave 4 — college/B2B2C)

| Item | Notes |
|---|---|
| TPO dashboard | 6 endpoints built but gated behind requireTpoAuth |
| College management | collegeId scoping exists, no admin UI |
| Outcome self-reporting | Table exists, no student-facing form |
| Control group / A/B | Not started |
| WhatsApp reminders | Deferred (cost + compliance concerns) |
| Multi-role RBAC | Placeholder only (user/admin/tpo enums) |

---

## License

Proprietary. Internal use only.
