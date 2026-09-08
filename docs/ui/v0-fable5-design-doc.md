# Kairos Mobile — Design System (Fable 5 × Apple-Luxury)

> **Purpose:** A single source of truth for the v0/Fable 5 UI generation of the Kairos mobile app. Every screen must be generated from this system — no orphan hex values, no ad-hoc radii, no new shadows. Declare the system, then build every screen from it. Verify in a real DOM (light **and** dark). Critique by measuring.
>
> **Stack contract:** React 19 + TypeScript, Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui primitives (`@/components/ui/*`), react-router (paths below), PWA-safe.

---

## 0. Product context (feed this to Fable)

Kairos is a **voice-first interview-prep mobile app**. It is a *product*, not a marketing site. Every day the user gets one adaptive interview question (DSA, OS, DBMS, Networks, OOP, System Design, Behavioral), answers it — by **typing or speaking out loud** (up to 120s per recording) — and receives AI evaluation (score /10, feedback, model answer, delivery analytics: wpm, fillers, pause count).

Target user: a **college student in placement season**, practicing daily on a phone, often at night, often on a slow connection. The app must feel **premium, calm, and encouraging** — a private training ground, not a gamified feed.

The product voice is encouraging and precise. Copy is short, concrete, and free of marketing fluff inside the app.

---

## 1. Design principles

Fable 5 discipline provides the *process and restraint*; Apple-luxury provides the *mobile polish*. The combination is the house style:

1. **Paper-to-glass.** Light mode is warm paper (`#FAFAFA`); dark mode is deep near-black glass (`#0F1115`) with subtle `backdrop-blur` panels and hairline borders. Dark is the hero face; light is fully first-class. Both must be flawless.
2. **One accent.** The Kairos indigo (`--brand-1 → --brand-2` gradient) is the *only* decorative accent. Amber and the red/green are **semantic status colors** (streak, mid/low scores, success/danger) — never decorative. Gradient is used sparingly: brand marks, hero numerics, active gradient text/backgrounds only.
3. **Precision over decoration.** Hairline separators (`1px` at low opacity, never thick borders), tight consistent spacing, single-pass shadow profile. Nothing glows; nothing floats hard.
4. **Typography is the interface.** SF-style UI sans (`system-ui / -apple-system / SF Pro`) for everything interactive; `ui-monospace` **micro-caps** (`text-[11px] uppercase tracking-[0.14em]`) for category labels, timestamps, metric labels; a single display weight for hero numbers (streaks, scores). Editorial serif is optional, reserved for marketing moments only (landing hero, welcome).
5. **Motion that earns its keep.** Transitions are `150–300ms`, opacity + transform only, standard easing. Micro-interactions (tab selection, pulses) exist to answer "what state is this in?" — nothing decorative, nothing bouncy. Honor `prefers-reduced-motion`.
6. **Mobile-native feel.** Bottom tab bar (iOS-style glass), safe-area respect (`env(safe-area-inset-*)` + `viewport-fit=cover`), ≥48px touch targets, thumb-reach first (primary action bottom-center, dismiss bottom-left/top-left), state persistence while swiping/backing.
7. **Honest states.** Every screen ships loading, empty, and error states — not just the happy path. Empty states are encouraging and give a next action.

---

## 2. Token system

Tailwind v4 CSS-first. All values are tokens; components reference tokens only.

### 2.1 Color — dark (hero)

```css
/* dark: data-theme="dark" */
--bg: #0F1115;            /* app background, near-black */
--surface: #171A21;       /* card / sheet, glass-tinted */
--surface-2: #20242E;     /* inset well, code block, transcript */
--surface-3: rgba(255,255,255,0.04);  /* hover wash */
--border: rgba(255,255,255,0.08);     /* hairline */
--border-strong: rgba(255,255,255,0.16);
--text: #E8EAF0;
--muted: #9AA2B0;         /* secondary text — 4.5:1 on #171A21 */
--faint: #67707E;         /* tertiary text / captions */
--brand-1: #818CF8;       /* indigo, THE accent */
--brand-2: #A78BFA;       /* violet, gradient partner */
--accent: #F59E0B;        /* amber — semantic (streak, mid score) */
--success: #4ADE80;
--danger: #F87171;
--gold: #FBBF24;          /* streak fire / special achievements */
--glass: rgba(23,26,33,0.72);         /* frosted panels */
--glass-blur: 20px;
```

Glass rules (dark):
- Bottom tab bar, sticky headers, modals/sheets: `bg-(--glass)` + `backdrop-filter: blur(var(--glass-blur))` + hairline top/bottom.
- Cards sit on flat `--surface`; only chrome (bars/sheets) is glass.

### 2.2 Color — light (paper)

```css
/* light: default */
--bg: #FAFAFA;
--surface: #FFFFFF;
--surface-2: #F4F4F5;
--border: rgba(24,24,27,0.09);
--border-strong: rgba(24,24,27,0.18);
--text: #18181B;
--muted: #64646B;
--faint: #9B9BA3;
--brand-1: #4F46E5;
--brand-2: #7C3AED;
--accent: #B45309;
--success: #16A34A;
--danger: #DC2626;
--gold: #B45309;
/* shadows — grounded, small, edge-tinted (Apple-soft): */
--shadow-sm: 0 1px 2px rgba(24,24,27,0.05), 0 2px 4px rgba(24,24,27,0.04);
--shadow-md: 0 4px 12px rgba(24,24,27,0.07), 0 2px 4px rgba(24,24,27,0.04);
--shadow-lg: 0 12px 28px rgba(24,24,27,0.10), 0 4px 8px rgba(24,24,27,0.06);
```

Dark shadows stay darker (`rgba(0,0,0,…)`), flatter — light sources are surface-local, not floating.

### 2.3 Category + difficulty color coding

Categories (chip/tag colors, both themes, tested for 4.5:1):

| Tag | Hue family | Light | Dark |
|---|---|---|---|
| DSA | indigo | `#4F46E5` | `#818CF8` |
| Operating Systems | cyan | `#0891B2` | `#22D3EE` |
| DBMS | emerald | `#059669` | `#34D399` |
| Networks | violet | `#7C3AED` | `#A78BFA` |
| OOP | teal | `#0D9488` | `#2DD4BF` |
| System Design | amber | `#B45309` | `#FBBF24` |
| Behavioral | rose | `#E11D48` | `#FB7185` |

Difficulty: **Easy** → success-green; **Medium** → amber; **Hard** → danger-red (semantic, not decorative).

Score pill: `>=8` success ("Strong answer"), `5–7` amber ("Solid effort"), `<5` danger ("Keep practicing").

### 2.4 Type

```css
--font-sans: system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
--font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
```

Fluid scale (`clamp()`), desktop-and-mobile safe. **Doc style:** display = calm 24/20, headline = 18, body = 16, caption = 14. Mono micro-caps = 11px uppercase `tracking-[0.14em]`.

| Token | v0 size | Weight | Use |
|---|---|---|---|
| display | `clamp(2rem, 1.6rem + 2vw, 3rem)` | 700–800 | hero numbers, streak, score |
| title-1 | `clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)` | 700 | page titles |
| title-2 | 18px / 700 | 700 | section headings |
| body | 16px / 400–500 | — | answers, feedback, settings |
| body-2 | 14px / 400–500 | — | secondary body |
| caption | 12px | — | metadata, date |
| micro | 11px mono, uppercase, `0.14em` | 500 | labels: category, metrics, statuses |

Line-height: body 1.5; headings 1.2. Letter-spacing: display −0.02em; headings −0.01em; body 0; micro +0.14em.

### 2.5 Spacing, radius, layout

- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64. Page gutter: 16 (safe-area accounted). Content max-width for the shell: 480px centered (mobile-first), 760px on bigger screens.
- Radius: `--radius-xs: 8px; --radius-sm: 12px; --radius-md: 16px; --radius-lg: 24px; --radius-full: 9999px`.
  - Cards/panels: 16–20px. Inputs: 12px. Chips, buttons: full/12. Sheets: top 24, handle bar.
- Shadows: only the 3-tier `shadow-sm/md/lg`. Never strokes + heavy shadow together.

### 2.6 Motion

- Duration: `default 200ms`, `fast 150ms`, `slow 300ms`. Easing: `cubic-bezier(0.2, 0, 0, 1)` (iOS-like) by default; `in-out` for panel/sheet.
- Only animate `opacity` / `transform` / `background-color`. No layout jank, no auto-size animation skeletons.
- Standing patterns:
  - **Recording** pulse: `@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }` 1.5s, on a 10px red dot. Timer ticks as mono `REC 0:00`.
  - **Verifying / streaming** spinner: thin 24px ring, brand-1, 0.8s linear spin.
  - **Tab select**: active tab tint transitions 150ms.
  - **Selection (onboarding):** `scale` 0.99→1 with color fill 150ms.
  - **Sheet**: translateY 12px→0 + fade, 280ms, in-out.
  - **Toast**: slide up 4px + fade, 200ms.
- `@media (prefers-reduced-motion: reduce)`: kill all non-essential animation.

### 2.7 A11y contour

- All text ≥ 4.5:1 on its surface (muted on surface ≥ 4.5). Focus rings: `--ring` (existing: 3px, brand-1 at 0.25 rgba). Every interactive control ≥ 44×44 (target 48).
- `prefers-reduced-motion` respected. Icon buttons always have `aria-label`. Tabs/segments semantics: proper role + aria-selected. Score pills and trends are never color-only (icon/shape companion).

---

## 3. Component grammar

All build on shadcn/ui primitives; app-specific components extend them. These are the **only** building blocks.

### 3.1 Primitives (shadcn/ui, `@/components/ui/*`)
`button`, `input`, `textarea`, `label`, `card`, `badge`, `avatar`, `separator`, `switch`, `checkbox`, `select`, `sheet`, `dialog`, `progress`, `skeleton`, `tabs`, `tooltip`, `toast`, `sonner`.

### 3.2 Navigation — bottom tab bar (new app shell)

- **iOS-style glass bar**, fixed bottom, 5 tabs: **Today** (`/`), **Practice** (`/practice`), **Skills** (`/skills`), **Progress** (`/streak` + `/leaderboard` and `/history` accessible via a small segmented header inside), **Profile** (`/settings`, `/billing`, `/referral`).
- Active tab: brand-1 tint icon + label; inactive: muted. Label = micro-caps or 10px. Bar height 56px + `env(safe-area-inset-bottom)`.
- Content never hides behind the bar — sibling `<main>` gets matching bottom padding.
- Top header per tab: glass, hairline bottom, shows page title (title-1) + contextual action (theme toggle, share). Not every screen has a header — result screens are immersive.

### 3.3 Buttons
- **Primary**: brand-1→brand-2 vertical gradient (or solid brand-1), white text, radius 12, height 52 (mobile), full-width when sole action.
- **Secondary**: `--surface-2` bg, text color, hairline border.
- **Ghost**: text-only, muted → text on press.
- **Danger**: red-tinted. **Disabled**: 40% opacity, no shadow, no hover.
- Destructive text fields that need typing (`DELETE_MY_ACCOUNT`) keep the input + button pattern.

### 3.4 Cards & tags
- **Card**: `--surface`, radius 16, hairline border, no shadow by default (flat, premium); elevation only via `shadow-sm` on special cases.
- **Score pill**: full-radius, colored bg at 12% + colored text, e.g. `8.4/10`.
- **Tag/Chip**: micro-caps 11px, category hue (6.2), difficulty semantic; selected chip = brand fill white text.
- **Segmented control** (Type | Speak): `--surface-2` well, selected segment white (`dark: surface-2 lighter`), 160ms fill.

### 3.5 Voice recording control (signature component)
- **Idle card**: mic glyph in a 56px circle, "Start recording", helper micro-caps ("Speak for up to 120 seconds · Answer as in a real interview").
- **Recording**: full-width brand/red-tinted panel; pulsing 10px red dot; title-letter mono timer `REC 0:00` ticking; thin `progress` bar for the 120s budget (brand-1 fill, turns amber >100s); "Stop & evaluate" primary bottom button. Mic denied/error states show a short, actionable message + "Change topic".
- Anti-glare: text remains `--text` on tinted bg (never low-contrast red-on-dark).

### 3.6 Charts
- **Radar (skills)**: SVG 10-dimension radar, brand-1 fill at 15% opacity, axis labels micro-caps. Scores as `progress` bars in the breakdown below (brand-1 fill + numeric + trend arrow not color-only).
- **Streak ring**: optional circular ring (days count in display weight, mono micro under).

### 3.7 Lists / tables / forms
- **List rows**: 56px min, hairline separators, chevron right, press = surface-2 wash.
- **Leaderboard table**: rank in mono micro, user 16px, stats right-aligned mono; your row highlighted with brand tint (not just color — add "You" tag).
- **Forms**: input height 52, radius 12, hairline → brand ring on focus. Field = micro-caps label, 4px gap. Error = danger text 12px under field (never only border color).

### 3.8 States (mandatory, per screen)
- **Loading**: skeleton shapes matching final layout (no spinner-only except brief auth).
- **Empty**: soft icon (line-art, muted), one encouraging sentence, one concrete action (button/link). e.g. History empty → "No answers yet" + "Answer today's question".
- **Error**: short message + single retry action. Never raw error text.
- **Streaming (AI eval)**: monospace token stream in `--surface-2` well, auto-scroll, brand-1 caret.

---

## 4. Screen inventory & specs

All screens below. Per screen: path, purpose, layout, key components, data, states, luxury moves.

### 4.1 App shell (all protected screens)

**Bottom tab bar** as in 3.2. Header: glass, page title-1 left, up to 2 ghost icons right (theme toggle + context action). Protected screens: `/`, `/onboarding`, `/practice`, `/skills`, `/streak`, `/leaderboard`, `/history`, `/history/:id`, `/settings`, `/billing`, `/referral`.

| Tab | Route | Icon |
|---|---|---|
| Today | `/` | sun/spark |
| Practice | `/practice` | waveform/mic |
| Skills | `/skills` | radar/pie |
| Progress | `/streak` (sub: `/leaderboard`, `/history` via segmented switch) | flame |
| Profile | `/settings` (sub: `/billing`, `/referral`) | person |

**VerifyEmailGate** (blocks all protected routes until email verified): centered, minimal — brand mark, "Verify your email", email micro-caps, primary "Resend verification email", success toast "Verification email resent. Check your inbox." Dark glass card on blurred backdrop.

### 4.2 Onboarding & Auth

| Screen | Spec |
|---|---|
| **Onboarding** `/onboarding` | 4 wizard steps, progress = hairline stepped indicator top (brand fills). **Welcome**: display title, 3 illustrated bullets, primary "Get started", ghost "Skip for now" (writes `/` redirect). **Goal**: 2×2 selectable cards (Campus / Off-campus / Specific company / Freelancing) — selected = brand fill white text + check. **Level**: 3 vertical radio cards (Beginner/Intermediate/Advanced + 1-line desc). **Topics + reminder**: chip grid multi-select (7 topics) + time input tile. **Confirm**: summary rows (Goal/Level/Topics/Reminder) + "Start prepping" primary. |
| **Login** `/login` | Full-bleed immersive: brand mark top-center, title-1 "Welcome back", subtitle 16 muted. Email + password fields (sticky password eye), primary "Sign in" bottom (safe-area padded). Secondary links: "Forgot password?" right-aligned above, "Create an account" below. Error = red banner above button (`403/401` generic message). |
| **Register** `/register` | Mirror of login + **name** field, **password strength** (4-segment bar + mono micro checklist: length, upper, lower, digit, special), **confirm password** (live mismatch hint), Terms checkbox (`/terms` inline link), Turnstile card. Referral code auto-applied. Primary "Create account". |
| **Forgot password** `/forgot-password` | Title, "We'll email a reset link (valid 1 hour)." Email field, primary "Send reset link". Success: form swaps to success panel with icon + "If that email exists, a link is on its way." Back to sign in. |
| **Reset password** `/reset-password` | Token from URL. Password + confirm (strength meter reuse). Success: check icon + "Password updated. Redirecting…" (auto to login). Error token: red panel + "Request a new link". |
| **Verify email** `/verify-email` | Token from URL. Three statuses, centered icon: **working** (spinner + "Verifying your email…"), **ok** (brand-check + "Your email is verified. Taking you to sign in…"), **error** (danger icon + readable message + "Back to sign in" + "Didn't get a link? Sign in and resend it from your dashboard."). Auto-navigate 1.6s on ok. |
| **Invite accept** `/invite/:code` | Transient: brand mark + micro-caps "Setting up your referral", auto `/register`. |

### 4.3 Dashboard & Practice (the core daily loop)

| Screen | Spec |
|---|---|
| **Today** `/` | **Streak pill** top (flame icon + "N day streak · longest M", ghost feel). **Question card**: category tag + difficulty tag row, question text (title-2), hairline. **Answer**: 140px textarea (placeholder "Type your answer here…"), micro "Minimum 20 characters", primary "Submit answer" bottom-full. **Inline progress**: on submit → evaluating card (spinner + mono streaming tokens, auto-scroll) → result. **Already answered**: "You're done for today" display + current streak + link to today's result (`/history/:id`). Error state → retry. |
| **Practice** `/practice` | **Pick**: title + subtitle ("Extra reps · pick a topic"), chip grid: "Surprise me" + 7 categories (tag colors). **Live question**: category/difficulty tags + "Change topic" ghost top-right; segmented **Type|Speak**. Type → textarea (140px). Speak → voice card: 3.5 (mic circle idle) → recording (pulse + REC timer + progress bar + "Stop & evaluate") → stage updates (Uploading / Transcribing / Evaluating with spinner + status micro). **After**: result view + **Follow-up card** ("Next up — targets your weak area") with a "Practice this" action. Skip = ghost right of primary. Mic errors = short message + change topic. |
| **AnswerResultView** (shared) | Question card on top; **score pill** (colored, /10 + label "Strong answer"/"Solid effort"/"Keep practicing"); streak note ("Practicing 6 days in a row") or "Practice answer". **Your answer** card (16px, hairline). **Feedback** card (bulleted, clear headers). **Model answer** card in `--surface-2` well. Failed eval → banner + retry. |
| **VoiceResultView** (shared) | **Overall band** (Strong / Solid / Needs work) + duration mono micro. **3-col dimension grid**: Content / Structure / Delivery, each band tag. **Delivery metrics** row: wpm · fillers/min · speaking % · pauses (mono micro labels). **Next step** card (brand-1 bg, white text). **What worked** / **What to improve** lists. **Transcript** `<details>` expander (`--surface-2`, mono-ish 14px, with "Show transcript/Hide"). |

### 4.4 Progress & Social

| Screen | Spec |
|---|---|
| **Skills** `/skills` | **Radar card** (SVG, brand fill 15%, mono micro axis labels) + **Breakdown rows**: name + category tag, `progress` bar + numeric, trend chip (arrow+color, not color-only). **ShareCard** (gradient brand-1→2, user initial avatar, streak flame, top strengths list) with Twitter / LinkedIn / Copy actions. Empty: "Complete some practice questions to see your skill profile." |
| **Streak** `/streak` | **Hero**: display number (current streak) + mono micro "day streak · longest M · freezes N" row. Explanatory micro line ("A freeze keeps your streak alive…one per week"). **Refill** primary (disabled at 1+). **Last week** card: answered count · avg score/10 · focus area (weakest category). **How it works** 3 bullets (immutable layout). |
| **Leaderboard** `/leaderboard` | Title + "You're ranked #N this week." Table: rank (mono) · name/"Anonymous" · answers · avg · streak+flame. Your row: subtle brand tint + "You" tag. Empty: "No completed answers yet this week. Be the first!" |
| **History** `/history` | Title + subtitle "Tap an answer to see score, feedback, and the model answer." **Rows**: category+difficulty tags, question (2-line clamp), date micro + score pill (colored) or status; chevron. **Load more** (mono micro button). Empty: line icon + "No answers yet" + CTA "Answer today's question". "Back to today" link. |
| **Answer detail** `/history/:id` | Back link (top-left chevron + "History"). Delegate to **AnswerResultView** / **VoiceResultView** per type. Loading skeleton; error → "Result unavailable" + retry. |

### 4.5 Account & Billing

| Screen | Spec |
|---|---|
| **Settings** `/settings` | Grouped cards (headers = mono micro caps). ① **Appearance** segmented Light/Dark/System + "Currently using X". ② **Notifications**: switches (push, evaluated-alert, daily reminder) + reminder-time tile + Save. ③ WebPush state row. ④ **Account stats** 4-grid (answers, streak, longest, member since). ⑤ **Change password** (current/new + strength + update). ⑥ **Your data** — "Download my data (JSON)" ghost. ⑦ **Danger** (red hairline card): typed `DELETE_MY_ACCOUNT` + danger button. |
| **Billing** `/billing` | Current-plan banner (Pro → renewal date + "Cancel subscription" danger ghost). **Plan cards**: Free (3 evals/day · 10 voice-min/day · tracking · streaks) / Pro ₹9.99/mo (unlimited · analytics · priority) with checkmark lists; current = "Current plan" disabled; upgrade = primary (Razorpay). Footnote: "Payments via Razorpay · cancel anytime." `?billing=success` refresh toast. |
| **Referral** `/referral` | Title + "Share your link — both earn free Pro days." Two reward tiles ("7 days you earn" · "3 days friend earns"). **Link box**: mono code + "Copy" (→ "Copied!" 2s). Stats row: "Friends invited: N · Remaining uses: N". |

### 4.6 Reading / marketing

| Screen | Spec |
|---|---|
| **Landing** `/` | Sticky glass navbar (brand + Log in ghost / Get started primary). **Hero**: display headline "Ace your next interview. One question a day."; subtitle; primary CTA "Start practicing" + micro "Free forever. No credit card."; optional editorial serif display word. **Features** 6-card grid w/ icon tiles (daily question · voice practice · skills radar · adaptive · streaks · follow-ups). **Pricing** 2 cards (Free vs Pro ₹9.99/mo). **Footer** (terms/privacy links). Immersive margins, hairline section separators. |
| **Terms / Privacy** `/terms` `/privacy` | Typographic pages: mono micro "Last updated: August 26, 2026", title-1, 16px body, 20px line-height; back link. **Token-application only — do NOT rewrite legal copy.** |

---

## 5. Delivery contract (what v0 must return)

1. React 19 + TS components, react-router paths as listed. No mock "app state" — use the shapes below only where a hook is already named; otherwise accept props and render.
2. **Tailwind v4 CSS-first.** All theme tokens in `@theme` / CSS vars, referenced as `bg-surface`, `text-muted`, `text-brand-1`, etc. No arbitrary hex outside `@theme`.
3. **shadcn/ui primitives** from `@/components/ui/*` for button, input, textarea, card, badge, avatar, separator, switch, checkbox, select, sheet, dialog, progress, skeleton, tabs, toast. App-specific (score pill, tag chip, segmented, streak pill, recording control, status icon, radar) as `@/components/*`.
4. Every interactive control ≥ 44px (prefer 48), `aria-label` on icon-only, semantic tags preserved, focus-visible rings.
5. **Both themes** — every screen verified in light and dark. Dark default sample; light twin required. No hard-coded colors anywhere.
6. Safe areas: `env(safe-area-inset-top/bottom)` respected; tab bar + primary actions clear of home indicator.
7. Motion per 2.6; `prefers-reduced-motion` honored.
8. All states present: loading (skeleton), empty, error, streaming where applicable.
9. **Quality gate before shipping a screen:** "Critique by measuring" — check contrast 4.5:1, tap targets 48px, spacing rhythm on the 4/8/... scale, exactly one accent, hairlines 1px. Fix violations, then return.