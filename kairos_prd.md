# Kairos — Product Requirements Document

**Version:** v0.2
**Status:** Web client live, mobile client in progress
**Author:** Umesh Chandra

---

## 1. Product Overview

Kairos is an AI-powered interview preparation app, available on web and mobile, built around one principle: turn dead time into progress. Named after the Greek concept of the opportune moment, Kairos delivers one interview question per day, evaluates the user's answer using an LLM, scores it, and builds a streak.

The target user is a pre-final or final year engineering student in India — aware of the anxiety of placement season, short on focused prep time, already spending hours on their phone. Kairos slots into existing behavior and converts idle moments into daily preparation.

### 1.1 The Core Loop

1. User opens the app
2. A question is served — one per day, calibrated to their profile
3. User types an answer
4. AI evaluates it: score, gaps, model answer
5. Streak updates
6. User closes the app

Total session time: 2–5 minutes. No login friction beyond initial sign-up. No prep planning.

### 1.2 Problem Statement

Existing interview prep tools require active scheduling and high intent. Students know they should prepare but postpone because the bar to start feels high. No product captures the micro-moments — commute, a 3-minute break, pre-sleep scroll — and converts them into meaningful prep.

### 1.3 Value Proposition

| For | Value |
|---|---|
| The Student | Daily accountability, zero planning overhead, AI feedback that feels like a real interviewer |
| The Habit | Streak mechanics + bite-sized sessions build a sustainable daily ritual |
| The Outcome | Active recall + immediate feedback outperforms passive review |

---

## 2. Target Audience

**Primary:** Pre-final and final year B.Tech/B.E. students in India, 20–23 years old, in active placement prep. High mobile usage, short attention spans, respond to streaks and social proof.

**Secondary:** Working professionals (0–3 YOE) preparing for a job switch — refresher on CS fundamentals, system design basics, behavioral questions. Same loop, different question weighting.

---

## 3. Core Features

### 3.1 Daily Question Engine
One question per day, drawn from a categorized bank:
- Data Structures & Algorithms
- Operating Systems
- Database Management Systems
- Computer Networks
- System Design
- Object-Oriented Programming
- Behavioral / HR

Difficulty adapts based on answer history and score trends.

### 3.2 AI Answer Evaluation
Core differentiator. On submission, the AI evaluates across:
- **Completeness** — were key concepts covered?
- **Accuracy** — anything technically wrong?
- **Clarity** — structured and interview-ready?

Returns: score (1–10), specific feedback, and a model answer. Feedback is encouraging, not clinical.

### 3.3 Streak & Scoring
- Daily streak counter
- Category-wise score tracking
- Weekly summary: questions answered, average score, weakest category
- Streak freeze (1/week) — prevents loss on a missed day
- Milestone badges at 7, 30, 100 days

### 3.4 Question History & Review
- Full log of every answered question with score and feedback preserved
- Re-answer any past question to track improvement
- Bookmarking
- Weak-area detection

### 3.5 Onboarding & Profile
Collected at sign-up: role (student/professional), target companies, current skill level, notification time.

---

## 4. Technical Architecture

### 4.1 Stack

| Layer | Choice |
|---|---|
| Web Frontend | React + Vite |
| Mobile Frontend | React Native + Expo |
| Backend | Node.js + Express |
| Database | MySQL + Drizzle ORM |
| AI Evaluation | OpenRouter API |
| Auth | Custom JWT + bcrypt |
| Notifications | Web Notifications API (web), Expo Push (mobile) |

### 4.2 AI Evaluation Flow
1. User submits answer → `POST /api/answer/submit`
2. Backend builds prompt: question + rubric hints + user answer
3. OpenRouter returns structured JSON: `{ score, feedback, modelAnswer }`
4. Stored against user ID + question ID + date
5. Score feeds streak engine and category aggregation

### 4.3 Data Models

```
User      { id, name, email, passwordHash, profile, createdAt }
Question  { id, category, difficulty, text, rubricHints }
Answer    { id, userId, questionId, date, text, score, feedback, modelAnswer }
Streak    { userId, current, longest, lastActiveDate, freezesRemaining }
```

---

## 5. Platform Scope

- **Web** — fully built and live
- **Mobile** — React Native client in active development, connects to the same backend

Same core loop and API contract across both. Mobile is the primary intended surface for the "bored, anywhere, anytime" use case; web serves as a companion/dashboard surface.

---

## 6. Roadmap

| Phase | Scope |
|---|---|
| Shipped | Web app — auth, daily question, AI evaluation, streaks, history |
| In Progress | Mobile app (Expo) — same core loop, push notifications |
| Next | Cherry-pick: QuestionContext fix, Leaderboard, deterministic question selection |
| Later | Company-specific tracks, voice input, payments |

---

## 7. Monetization Strategy

| Tier | Details |
|---|---|
| Free | 1 question/day, basic feedback, streak tracking — forever free |
| Kairos Pro | Unlimited questions, detailed feedback, company tracks, ad-free |
| Pricing | ~₹99/month or ₹699/year |

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| D1 Retention | >40% |
| D7 Retention | >25% |
| Avg Streak Length (week 3) | >5 days |
| Session Length | 2–5 min |
| Free → Pro Conversion | >5% of DAU within 60 days |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AI feedback feels generic | Invest in prompt/rubric quality; manually review early evaluations |
| Habit drop-off after day 3–5 | Smart notification copy, streak freeze, weekly re-engagement summaries |
| Question bank exhaustion | Build to 300+ questions before wide launch; re-serve oldest answered if exhausted |
| LLM cost at scale | Cache model answers per question; only evaluate unique answers |
| Platform lock-in risk | Keep backend standalone — avoid dependencies on third-party platform SDKs |

---

## 10. What's Explicitly Out of Scope

- Voice input
- Company-specific question tracks
- Payments / Pro tier
- Third-party platform integrations (e.g. Manus, Clerk) — deliberately avoided to keep the stack portable and self-owned

---

## 11. Definition of Done (Current Phase)

1. Mobile app reaches feature parity with web: auth, daily question, AI evaluation, streak, history, profile
2. Push notifications working on mobile
3. Both clients share the same backend without duplication or drift
4. All core-loop and streak logic tested per the mobile build spec's testing checklist
