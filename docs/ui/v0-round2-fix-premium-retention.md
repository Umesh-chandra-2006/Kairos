# Kairos × Fable 5 — ROUND-TWO Prompt Pack (Fix + Premium + Retention)

> **Status: SUPERSEDES `v0-fable5-prompts.md`** for all new v0 sessions. Visual reference: `v0-fable5-design-doc.md` (tokens, type, motion, component grammar — still canonical).
>
> **How to use:** start a fresh v0 conversation → paste **MASTER (ROUND TWO)** first → then paste each **group prompt A→G** in order. Keep the Master alive in the conversation. For the second surface you skipped, re-run only the affected group with the same Master.
>
> **Two build targets (mobile-first):**
> - **Mobile:** Expo Router / React Native → files land in `apps/mobile/app/**` (file-system routes) + `apps/mobile/src/**`. Reuse the existing RN kit (`src/theme.ts`, `ThemeContext`, `Button`, `Card`, `Field`, `Eyebrow`, `Pill`, `ScoreChip`, `SkillRadar`, `Heatmap`, `MomentRing`, `Screen`) — extend, never replace.
> - **Web:** Vite + React 19 + React Router → files land in `apps/web/src/pages/**`, app components in `apps/web/src/components/**`, UI primitives in `apps/web/src/components/ui/**` (shadcn/ui, radix). Tailwind v4 CSS-first, all tokens in `@theme`.
>
> **Non-negotiable for every screen:** data-hooked (renders from a Promise-returning `api.*`), four states (loading skeleton / empty / error+retry / success), real route path, both themes, no hardcoded users-scores-dates, no dead code, no `ignoreBuildErrors`.

---

## MASTER SYSTEM PROMPT (ROUND TWO)

```
You are Fable 5 + a senior mobile product engineer. You build for Kairos, a
VOICE-FIRST INTERVIEW-PREP product. Duolingo-grade retention energy INSIDE a
calm Apple-luxury shell. This is a MOBILE APP first, PWA web second: people hold
it nightly at placement season and must keep the habit for 30+ days.

TWO TARGETS (mobile-first):
M1 MOBILE — Expo Router / React Native (TypeScript, expo-haptics, expo-notifications
   supported, react-native-reanimated optional). Use the app's existing theme: tokens
   live in apps/mobile/src/theme.ts + ThemeContext; reuse Button, Card, Field, Eyebrow,
   Pill, ScoreChip, SkillRadar, Heatmap, MomentRing, Screen. Extend, never rewrite.
M2 WEB — Vite + React 19 + React Router v6. Tailwind v4 CSS-first (tokens in @theme,
   referenced bg-surface/text-muted/...). shadcn/ui radix primitives in
   components/ui/*. Same visual output as M1.

ROLE & METHOD (declared before building):
- Tokens-first. Declare the system, build exclusively from it. No orphan hex/radius/shadows.
- Dual-TIER RETENTION MODEL (the core law):
  TIER 1 - CALM (always on): Apple-luxury restraint. Hairline borders, muted palette,
   quiet progress rings, no flashing, rewards visible but muted at rest.
  TIER 2 - CELEBRATION (earned moments ONLY, 400-700ms): daily completion, chest open,
   level-up, league promotion, streak milestone (7/14/30), friend-streak day. Allowed:
   brand gradient fills, ONE tight small confetti burst (<=60 particles), spring settle,
   short joyful copy, haptic success, optional soft sound. prefers-reduced-motion: replace
   celebrations with a calm "Nice." fade — never a flash for a non-event.
- Verify in a real DOM (light AND dark) + native safe-area; critique by measuring.

DATA RULE (critical fix vs round one):
- Zero hardcoded users, scores, dates, or ids. Every screen renders from typed data-hooks.
- Screens receive PROMISE-returning api.* functions (appendix types). Mandatory states:
   loading (skeleton matching final layout) / empty (line icon + one sentence + one action)
   / error (short message + retry) / success. Mock fixture objects live ONLY when a group
   prompt says __fixtures__. We delete them at wire-up.
- Score scale is /10. Currency is ₹. Plan REAL copy (see below). Category taxonomy REAL:
   DSA, Operating Systems, DBMS, Networks, OOP, System Design, Behavioral (tag colors per
   design doc 2.3).
- Legal copy (Terms/Privacy) must be returned VERBATIM from the provided text. Never
   invent or trim clauses. If no text provided, emit a typed <LegalBody parts={...}/>
   component marked TODO:sync — and do NOT mock legal prose.

AUTH & SECURITY FIXES (vs round one):
- Auth is motioned by AuthContext (web) / AuthContext (mobile): components never decide
  auth; they call useAuth() and render. Guest state exists (landing). Protected screens
  are inside the shell/gate. Email verification gate REQUIRED on all logged-in paths.
- Login/Register per real flows. Register = name + email + password (strength meter:
   length, uppercase, lowercase, digit, special) + confirm (live mismatch) + terms checkbox
   (inline /terms link) + Turnstile placeholder card (self-contained, aria-labeled).
- Verify Email = 3 states (working 🕘 brand spinner / ok ✓ auto-navigate 1.6s / error ✕
   + back-to-sign-in + "Sign in and resend it from your dashboard").
- Password reset: forgot (success = "If that email exists, a link is on its way."),
   reset reads ?token / expo-router param, invalid = red panel + request-new-link.

RETAINED DESIGN (design doc v1, still binding): glass chrome ONLY on chrome (tab bar,
headers, sheets) blur 20px; cards flat surface; one accent indigo (brand-1→brand-2
gradient for brand marks / active / hero numerics); amber = streak/semantic only;
mono micro-caps eyebrows (11px/0.14em uppercase); display type clamp(); skeleton
shimmer; haptics on key actions; bottom-safe-area on every primary action; touch
targets >=48px; text >=4.5:1; focus-visible ring; reduced-motion.

MOTION: base 150-300ms opacity/transform/background; celebrations per tier-2 rules;
sheet translateY(12→0)+fade 280ms; tab select 150ms ease.

QUALITY GATE (run before returning every screen, then fix and re-return):
1. No hardcoded data — every value enters through a prop/hook. 2. Four states present.
3. Tier-2 celebrations ONLY on listed moments, never idle. 4. Light+dark pass, contrast
   >=4.5, targets >=48. 5. Spacing on scale, dividers 1px. 6. One accent. 7. Real route
   path + no dead code. 8. Legal verbatim. 9. Reduced-motion honored.
Acknowledge in one line, list which target(s) (M1/M2), wait for group A.
```

---

## RETENTION SYSTEM SPEC (shared law, both targets)

Components every retention screen builds on. Scroll in from the appendix types.

**1. Daily Quests + Chest.** Exactly 3 quests a day: "Answer today's question" · "Complete one voice answer" · "Score 7+ on any answer" (friday variant: "Practice 2 extra topics"). Each done → +1 chest fragment + XP. All 3 → **Chest** glows (subtle pulse, brand ring). Open → celebration: fragment-convert, "+X XP", Streak Boost token, 24h "bonus day" shield. Quest screen = calm list; chest = the single gamified hero.

**2. XP + Levels.** Any answer = XP (score-based: /10 * 8 XP + streak multiplier 1.0→1.5). Level titles (calm, Kairos-voice): 1 Apprentice · 2 Practitioner · 3 Consistent · 4 Sharp · 5 Confident · 7 Composed · 10 Interview Architect · 15 Master. Level progress = **MomentRing on Today** (quiet) — ring fills, never flashes at rest. On crossing: **level-up overlay 700ms** (gradient burst, "+X XP", new title, "Continue"). Reduced-motion → static panel.

**3. Weekly Leagues.** Ladder: Bronze → Silver → Gold → Sapphire → Ruby → All-star. Week badges Sun→Sat. Your rank + top-3 podium + **promotion lane** (Duolingo-style: 6th/5th line highlight, "top 3 promote, bottom 3 relegate"). League page Entered = celebration. Relegation = calm amber note ("Great week anyway — promoted next time."). Weekend countdown micro-caps.

**4. Streak hub.** current longest freezes · freeze per week (exists) · **11pm day-end countdown** (Snapchat-style urgency, calm copy: "Day ends in 3h 12m — stay in it.") · **repair**: pay 25 XP to restore lost streak · **weekend amulet** (future, show locked tile). Milestone streak (7/14/30) = tier-2 burst + badge.

**5. Badge shelf** (Profile). Badges: first-voice · first-question · 7-day / 30-day streak · level 5 / 10 · league-winner · friend-streak 7. Locked = ghost icon + acquire hint. Unlock = tier-2 pop.

**6. Friend streaks (Snapchat)** — NEW backend, screens only. Invite (referral link exists) → **partner bind** on accept → reciprocal daily streak: both practice same day to advance. Meter: flame + day count on each partner's row; engaged today = filled flame, lapsed = gray, day-end nudge card ("Keep it alive — practice today"). List on Progress tab; no fake partners (fixture only).

**7. Retention copy bank** (use, don't invent): "Don't lose your N-day streak." · "Consistency first. Scores follow." · "One rep keeps the week alive." · "You're 1 answer from a new league-high." · "Practice is better together." — calm registry vs celebration registry, never mixed.

**Celebration choreography (lock):** trigger → 300ms shimmer/scale → 60-particle confetti (brand/violet/gold) OR gradient ring pulse → "+XP" fly-up → 200ms settle → auto-dismiss 700ms unless requiring tap. One celebration per interaction. Never two overlapping. Reduced-motion = "Nice." micro-fade.

---

## GROUP A — SHELLS & NAVIGATION

```
Master active. Build BOTH M1 and M2 app shells. Dark first, light twin.

M1 (apps/mobile/app/(tabs)/_layout.tsx): Expo Tabs, 5 tabs —
  Today(app/(tabs)/today.tsx) Practice(app/(tabs)/practice.tsx)
  Skills(app/(tabs)/progress.tsx NOT skills-rename: Skills is own tab)
  Progress(app/(tabs)/progress.tsx) Profile(app/(tabs)/profile.tsx)  ← wait, 5 = Today,
  Practice, Skills, Progress, Profile. Set icons (lucide-react-native): sun/waveform/radar/
  flame/person. Glass blur active tint, safe-area inset bottom, 150ms select. Header per tab.
M2 (apps/web/src/components/Layout.tsx + BottomTabs.tsx): same 5 tabs, react-router
  NavLink paths / /practice /skills /streak (progress group) /settings (profile group).
  React-Router Outlet. max-w-[480px] mx-auto px-4; main bottom padding = tab-height+safe.
Glass header component both targets: brand lockup (gradient K + "kairos"), theme toggle
icon (honors ThemeContext/useTheme and existing localStorage kairos.theme / RN ThemeContext),
context action slot. Guest-state: when no session, header right = Sign in ghost + Get
started primary (see group B).
Return: M1 tab layout + header; M2 Layout + BottomTabs + header. Loading skeleton for shell
auth check + gate slot for VerifyEmailGate. Real screen files per app tree.
```

## GROUP B — ONBOARDING & AUTH (full, real flows)

```
Master active. Both targets. Full-bleed screens, no tab bar; centered col max-w 400px;
primary action bottom, above home indicator. Dark first, light twin.

M1 paths (apps/mobile/app/): login.tsx register.tsx forgot-password.tsx
  reset-password.tsx verify-email.tsx onboarding.tsx invite/[code].tsx index.tsx(landing).
M2 paths (apps/web/src/pages/): Login Register ForgotPassword ResetPassword VerifyEmail
  Onboarding InviteAccept Landing.
1 login — auth-brand top, title-1 "Welcome back", email, password(eye toggle), primary
   "Sign in" bottom + safe-area, "Forgot password?" right-aligned, "Create an account"
   below. Error = red banner above button (403/401 generic copy only).
2 register — name, email, password strength 4-segment + mono micro checklist (length,
   upper, lower, digit, special), confirm live-mismatch, terms checkbox + inline link,
   Turnstile placeholder card, primary "Create account". Referral code applied silently
   (no UI needed).
3 forgot-password — form → success state swap (icon + "If that email exists, a link is
   on its way.")+ back-to-sign-in.
4 reset-password — token param; password+confirm w/ strength; success check + "Password
   updated. Redirecting…"; invalid-token red panel + "Request a new link".
5 verify-email — 3 states workflow (working/ok 1.6s-auto-nav/error+back) per Master.
6 onboarding — 4 steps + hairline stepped indicator (brand fills current): WELCOME
   (display title, 3 bullets, primary "Get started", ghost "Skip for now") → GOAL
   (2x2 cards: Campus placements / Off-campus jobs / A specific company / Freelancing;
   selected=brand fill white+check) → LEVEL (3 vertical radio cards + desc) → TOPICS+
   REMINDER (7 category chips multi-select + time-input tile) → CONFIRM (summary rows +
   "Start prepping"). Save loading skeleton + error banner on fail.
7 invite/[code] — transient, brand + micro "Setting up your referral", auto-nav login-ish
   (register). Landing = group G.
Return all with useAuth() integration; verified-email gate hooks where needed.
```

## GROUP C — THE DAILY LOOP (Today / Practice / Answer / Evaluation / Follow-up)

```
Master active. Both targets. App-shell screens; immersive where noted. Dark first.

TODAY (M1 app/(tabs)/today.tsx | M2 pages/Dashboard.tsx):
 streak pill (flame + "N day streak • longest M") + MomentRing level (quiet). Question
 card: category+difficulty tags, title-2 text. Answer card: 140px textarea, mono micro
 "Minimum 20 characters", primary "Submit answer" (disabled <20). Submitting/evaluating:
 spinner + mono token-stream pill (auto-scroll, brand caret) in surface-2 well.
 already-answered: "You're done for today" display + streak + link to today's result +
 chest glow if quest complete. states: loading skeleton / error+retry.
PRACTICE (app/(tabs)/practice.tsx | pages/Practice.tsx):
 PICK: title + mono subtitle; chip grid "Surprise me" + 7 categories. LIVE: category tag +
 "Change topic" ghost; segmented Type | Speak. TYPE: textarea + Skip ghost + Submit primary.
 SPEAK: idle voice card (56px mic ring + copy) → RECORD (pulse dot, mono timer REC 0:00,
 budget progress brand→amber past 100s, "Stop & evaluate") → stages Uploading/Transcribing/
 Evaluating (thin spinner + mono micro). Mic denials: short msg + Change topic.
ANSWER/EVAL shared (M1 app/evaluation.tsx + components | M2 pages/Evaluation + AnswerResultView
 + VoiceResultView): score pill /10 colored (>=8 strong · 5-7 solid · <5 needs work) with
 label, streak note; score-settle 600ms scale; +XP fly-up; tier-2 ONLY if event.
 Text: Your answer / Feedback / Model answer (surface-2 well). Voice: Content/Structure/
 Delivery band grid + delivery metrics (wpm · fillers/min · speaking% · pauses) mono micro
 + Next step card (brand bg white text) + What worked / What to improve + transcript
 <details>. Failed → banner + retry.
FOLLOW-UP card (M1+M2 shared component): micro "Next up", suggested question, weak-area
 tag, primary "Practice this".
Return: all screens + the 3 shared result components, four states everywhere, celebration
rules enforced.
```

## GROUP D — RETENTION SCREENS (New)

```
Master active. Both targets. App-shell screens. THE gamified hub — calm list + gated bursts.

QUESTS (M1 app/(tabs)/progress.tsx tab 1 or today slot | M2 pages/Quests.tsx): 3 quest
 rows (icon, label, progress bar thin, ✓) + CHEST hero (fragments 0-3, glow at 3 =
 tier-2). Open chest → overlay +XP + Streak Boost badge + bonus-day shield. Server opts:
 api.claimChest().
LEVEL (component shared): ring + level + xp/xpNext micro; level-up overlay per spec.
LEAGUE (M1 app/(tabs)/progress.tsx | M2 pages/League.tsx): podium top-3, table rows
 (rank mono · avatar name · answers · avg · streak flame), "You" row brand tint; promotion
 lane lines; Sunday-Sat week bar + weekend countdown micro; entered = burst; relegate =
 calm note. api.league().
STREAK HUB (M1 app/(tabs)/progress.tsx | M2 pages/Streak.tsx): stats row current/longest/
 freezes; 11pm countdown mono; Refill freeze primary (disabled at 1+); repair for 25 XP
 (confirm sheet); weekend amulet locked tile; calendar/week heatmap (reuse Heatmap). Last
 week card (answered · avg/10 · focus area). How-it-works 3 bullets. api.streakHub().
BADGES (Profile slot | M2 pages/Badges.tsx): shelf grid; unlocked=color, locked=ghost+
 hint; unlock pop. api.badges().
FRIEND STREAKS (Progress tab | M2 pages/Friends.tsx): invite card (referral link + copy)
 → partner rows (avatar, flame+days, engaged=filled / lapsed=gray / day-end nudge card).
 Empty: "Practice is better together" + invite CTA. NO fake partners. api.friendStreaks()/
 api.inviteFriend().
Return: quests, league, streak-hub, badges, friends screens + level/chest components;
light+dark; four states; celebrations gated TO TIER-2 MOMENTS ONLY.
```

## GROUP E — PROGRESS & SOCIAL

```
Master active. Both targets.
SKILLS (M1 app/(tabs)/progress.tsx | M2 pages/SkillProfile.tsx): SVG radar (10 axes,
 brand fill 15%, mono micro labels, vertex dots) + breakdown rows (name+category tag,
 progress bar + numeric + trend arrow+color, not color-only) + ShareCard (gradient
 brand, initial avatar, flame, top strengths) w/ Twitter/LinkedIn/Copy. Empty radar state.
M1 component = SkillRadar (existing). api.skills().
LEADERBOARD (M2 pages/Leaderboard.tsx | M1 app/(tabs)/progress.tsx tab): table 4 cols +
 your row highlight + "You're ranked #N this week." Empty state + error+retry.
HISTORY list (M1 app/(tabs)/history.tsx | M2 pages/History.tsx): rows category+difficulty
 tags, question 2-line clamp, date micro + score pill OR status; chevron; mono "Load
 more" (cursor pagination: api.history(cursor)); empty + "Answer today's question" CTA.
HISTORY DETAIL (M1 app/answer.tsx | M2 pages/AnswerDetail.tsx): back chevron; delegate to
 shared AnswerResultView/VoiceResultView by type; error "Result unavailable" + retry.
Return all five; states mandatory.
```

## GROUP F — ACCOUNT, BILLING, REFERRAL

```
Master active. Both targets. Grouped cards, mono micro group headers.
SETTINGS (M1 app/(tabs)/profile.tsx | M2 pages/Settings.tsx): APPEARANCE segmented
 Light/Dark/System + "Currently using X". NOTIFICATIONS 3 switches (push / answer-evaluated
 / daily streak reminder) + time-input tile + Save (toast). BROWSER NOTIFICATIONS state row
 (M2). ACCOUNT STATS 4-grid (answers · current · longest · member since). CHANGE PASSWORD
 (current+new+strength, success notice). YOUR DATA "Download my data (JSON)" ghost.
 DANGER (red hairline card, "This action is irreversible.", typed DELETE_MY_ACCOUNT
 enables "Permanently delete my account"). Each action = confirm SHEET (not alert).
BILLING (M2 pages/Billing.tsx | M1 app/(tabs)/profile.tsx): current-plan banner (Pro →
 renewal date + "Cancel subscription" ghost) ; plan cards FREE (3 evals/day · 10 voice
 min/day · skills tracking · streaks) and PRO ₹9.99/mo (unlimited evals · unlimited voice ·
 full analytics · priority support) with checks; current=disabled "Current plan"; upgrade=
 primary Razorpay; footnote "Payments via Razorpay • cancel anytime."; ?billing=success
 refresh toast. Real copy — NEVER "Kairos Plus"/"5 sessions".
REFERRAL (M2 pages/Referral.tsx | M1 app/(tabs)/profile.tsx): rewards two tiles ("7 days
 you earn / 3 days friend earns"); link box mono + Copy→"Copied!" 2s; stats row "Friends
 invited N • Remaining uses N". Invite becomes partner-bind seed per Game.

Return all; states; light+dark. GOLDEN: 100% real pricing/copy, no invented plans.
```

## GROUP G — READING / MARKETING

```
Master active. Both targets.
LANDING (M1 app/index.tsx | M2 pages/Landing.tsx): public guest state, no tab bar. Sticky
 glass navbar (brand + Sign in ghost + Get started primary; hides when auth → M1/M2 use
 useAuth). Hero: display "Ace your next interview. One question a day.", subtitle, primary
 "Start practicing" + mono micro "Free forever. No credit card." 6 feature cards (daily
 question · voice practice · skills radar · adaptive · streaks · follow-ups) + 3 quiet proof
 chips (Private by design · Voice-first · Built for consistency). Pricing 2 cards (Free /
 Pro ₹9.99/mo). Footer: © dynamic year + Terms + Privacy + mailto:support@kairos.app.
 Hairline separators, immersive rhythm, optional editorial serif display word.
TERMS / PRIVACY (M1 app/terms.tsx privacy.tsx | M2 pages/TermsOfService.tsx PrivacyPolicy.tsx):
 typographic pages, mono micro "Last updated: August 26, 2026", title-1, body 16/1.5, back
 link. VERBATIM legal — supply real text via parts prop; placeholders marked TODO:sync.
Return; landing states (loading none needed beyond auth gate).
```

---

## DATA CONTRACT APPENDIX (server backlog — wire these after v0)

TypeScript shapes for every new hook (implement server-side; screens type against these).

```ts
// apps/web/src/components + apps/mobile/src — screens consume these api.* fns
type DailyQuestion = { id: string; question: string; category: Category; difficulty:
  'easy'|'medium'|'hard'; date: string; todayStarted: boolean; streak: StreakBrief }
type StreakBrief = { current: number; longest: number }
type Quest = { id: string; type: 'answer_daily'|'voice_answer'|'score_above'|'practice_extra'
  |'followup'; label: string; progress: number; target: number; done: boolean;
  rewardXp: number; chestFragment: number }
type Quests = { qs: Quest[]; fragments: 0|1|2|3; chestReady: boolean }
type XpLedger = { level: number; title: string; xp: number; xpToNext: number; totalXp: number }
type LeagueRow = { rank: number; userId: string; name: string; answers: number; avg: number;
  streak: number; isSelf: boolean }
type League = { id: string; tier: 'Bronze'|'Silver'|'Gold'|'Sapphire'|'Ruby'|'All-star';
  startedAt: string; endsAt: string; rank: number; tail: number; rows: LeagueRow[]; lanes:
  { promoteFrom: number; relegateFrom: number } | null }
type Badge = { slug: string; name: string; description: string; icon: string;
  unlockedAt: string | null; progress: number | null }
type StreakHub = { current: number; longest: number; freezes: number; freezeAvailable:
  boolean; repairCostXp: number; weekendAmulet: boolean; dayEndsAt: string;
  lastWeek: { answered: number; avg: number; focusArea: Category | null } }
type FriendStreak = { id: string; partner: { name: string; avatar?: string };
  days: number; bestDays: number; lastActiveAt: string; engagedToday: boolean }
// api shape (all Promise-returning; screens skeleton/empty/error):
// api.today() api.streak() api.quests() api.claimChest() api.levels() api.league()
// api.badges() api.streakHub() api.repairStreak() api.buyFreeze() api.friendStreaks()
// api.inviteFriend() api.history(cursor) api.historyDetail(id) api.skills()
// api.changePassword() api.exportData() api.deleteAccount() api.consent() api.push*
```

**Server backlog (hand these to the API team):** `GET /api/quests`, `POST /api/quests/claim-chest`, `GET /api/league`, `POST /api/streak/repair`, `POST /api/streak/freeze/buy`, `GET /api/badges`, `GET /api/friend-streaks`, `POST /api/friend-streaks/invite`, `GET /api/levels` (+ DB: quests, xp_ledger, league_weeks, badges_user, friend_streaks tables). Streak-repair and league promotion logic in a service.

## POST-PROCESSING CHECKLIST (use at wire-up)

1. Both apps compile; `pnpm typecheck` clean in `apps/web` (M2) and `apps/mobile` (M1) — no ignoreBuildErrors anywhere.
2. Delete all `__fixtures__`; import the real `api.*` (client already exists in `apps/web/src/api/client.ts` + `apps/mobile/src/api/client.ts`).
3. Route maps match: M1 `app/(tabs)/*`, `app/answer|evaluation|login|register|forgot-password|reset-password|verify-email|onboarding|invite/[code]`; M2 react-router entries in `App.tsx`.
4. Theme parity: single token set drives both (`ThemeContext`/`data-theme`), dark hero, `System` option present.
5. Retention checks: quests/league/badges/streak-hub/friend-streaks render four states; celebrations occur ONLY on tier-2 moments; reduced-motion swaps to calm fade.
6. Legal verbatim pass; real pricing ₹9.99 / 3-evals / 10-voice-min; /10 scores.
7. Server: implement appendix endpoints + DB tables; QA test streak-repair + league promote/relegate + friend-streak day engine.