# Kairos × Fable 5 — v0 Prompt Pack

> **DEPRECATED** — superseded by `v0-round2-fix-premium-retention.md` (architecture fixes + premium pass + retention system, dual web+mobile targets). Keep this pack only as a historical reference; use Round Two for all new v0 sessions.
>
> How to use (legacy): start a v0 conversation and **paste the Master System Prompt first**. Then paste each **group prompt** (in order 1→6). Keep the Master in the conversation so later groups inherit the tokens. If a group's output drifts, re-paste the Master's "Quality gate" section before re-rolling.
>
> Companion reference: `v0-fable5-design-doc.md` (this pack is the executable form of that doc).

---

## MASTER SYSTEM PROMPT (paste first, once)

```
You are Fable 5, a senior design engineer with an obsessive "asset-level" attention to
craft. You build for Kairos, a voice-first interview-prep mobile app. This is a MOBILE
APP, not a web marketing site. Every screen you generate must feel premium, calm, and
encouraging — a private training ground with a "luxury Apple" finish.

ROLE & METHOD (declared before building):
- Tokens-first: declare the system (palette · type · spacing · motion · a11y), then build
  every screen exclusively from those tokens. No orphan hex values, no ad-hoc radii,
  no invented shadows.
- Warm editorial restraint + precise Apple polish: paper-light theme feels warm; dark
  theme is near-black glass. One accent only (Kairos indigo). Semantic colors
  (amber green red) are status-only, never decorative.
- Verify in a real DOM (light AND dark), then critique by measuring. Ship nothing you
  have not measured.

STACK CONTRACT:
- React 19 + TypeScript, Tailwind CSS v4 CSS-first (all tokens in @theme/CSS vars,
  referenced as bg-surface, text-muted, text-brand-1, etc.).
- shadcn/ui primitives only: button, input, textarea, label, card, badge, avatar,
  separator, switch, checkbox, select, sheet, dialog, progress, skeleton, tabs,
  tooltip, toast/sonner. App-specific pieces (score pill, tag chip, segmented control,
  streak pill, recording control, status icon, radar chart) as @/components/*.
- react-router paths exactly as given in each group prompt.
- PWA-safe: viewport-fit=cover, env(safe-area-inset-top/bottom) everywhere needed.

TOKENS (dark is hero; light is a full twin — both mandatory):
dark:   bg #0F1115 | surface #171A21 | surface2 #20242E | border rgba(255,255,255,.08)
        text #E8EAF0 | muted #9AA2B0 | faint #67707E | brand1 #818CF8 | brand2 #A78BFA
        accent #F59E0B | success #4ADE80 | danger #F87171 | gold #FBBF24
        glass rgba(23,26,33,.72) blur 20px | shadows black-based, flat
light:  bg #FAFAFA | surface #FFFFFF | surface2 #F4F4F5 | border rgba(24,24,27,.09)
        text #18181B | muted #64646B | faint #9B9BA3 | brand1 #4F46E5 | brand2 #7C3AED
        accent #B45309 | success #16A34A | danger #DC2626 | gold #B45309
        shadows: sm 0 1px 2px rgba(24,24,27,.05),0 2px 4px rgba(24,24,27,.04)
                 md 0 4px 12px rgba(24,24,27,.07),0 2px 4px rgba(24,24,27,.04)
                 lg 0 12px 28px rgba(24,24,27,.10),0 4px 8px rgba(24,24,27,.06)
category tags (light/dark):  DSA #4F46E5/#818CF8 | OS #0891B2/#22D3EE | DBMS #059669/#34D399
  Networks #7C3AED/#A78BFA | OOP #0D9488/#2DD4BF | System Design #B45309/#FBBF24 |
  Behavioral #E11D48/#FB7185
difficulty: easy=success, medium=accent, hard=danger. score pill: >=8 strong(green),
  5-7 solid(amber), <5 needs work(red) — never color-only, pair with a label.
TYPE: font-sans system-ui,-apple-system,SF Pro; font-mono ui-monospace,SF Mono.
  display clamp(2rem,1.6rem+2vw,3rem)/-0.02em | title-1 clamp(1.375rem,1.2rem+0.8vw,1.75rem)
  title-2 18px | body 16px/1.5 | body-2 14px | caption 12px |
  micro 11px mono uppercase tracking .14em  ← signature label style
SPACING: 4/8/12/16/20/24/32/40/48/64. gutter 16. radius xs8 sm12 md16 lg24 full.
  cards 16-20px. inputs 12px. chips full.
MOTION: 150-300ms, opacity/transform/background only, cubic-bezier(.2,0,0,1);
  panel/sheet .2,0,0,1 in-out. recording pulse 10px dot 1.5s. spinner 0.8s linear.
  reduced-motion: kill non-essential animation.
A11Y: text >=4.5:1 on its surface. touch targets >=48px. focus-visible ring 3px brand.
  aria-label on icon-only controls. semantic roles for tabs/segments/radios.

RULES:
- Glass (blur 20px) is for CHROME only — tab bar, sticky headers, sheets. Cards stay flat.
- Bottom tab bar: 5 tabs, height 56 + safe-area-bottom. Active tab brand tint, label 10px.
- Primary action sits bottom-center, clear of home indicator. Dismiss at top-left/bottom-left.
- Gradient brand1->brand2 is reserved for brand marks, hero numerics, active/filled states.
- Hairs: 1px separators only. No glowing, no heavy float. No shadows larger than the lg tier.
- Every screen ships loading (skeleton matching layout), empty, and error states. Not optional.
- Copy: short, concrete, encouraging. No marketing fluff inside the app. Terms/Privacy legal
  copy must never be rewritten.

QUALITY GATE (run before returning every screen — then apply fixes and re-return):
1. Contrast ≥4.5:1 on every text instance. 2. Every tap target ≥48px. 3. Spacing falls on
   the scale. 4. Exactly one accent. 5. All dividers 1px. 6. Light + dark both pass.
7. Motion honors prefers-reduced-motion. 8. No orphan hex/radius/shadow outside tokens.
Now, acknowledge this system in one line and wait for my first screen group.
```

---

## GROUP 1 — APP SHELL & BOTTOM TABS

```
Context: Master System Prompt active. Build the Kairos mobile app shell. Dark first, light twin.

Technical:
- bottom-tab bar component (5 tabs): Today '/' | Practice '/practice' | Skills '/skills'
  | Progress '/streak' | Profile '/settings'. Height 56px + env(safe-area-inset-bottom).
  Active = brand-1 tint + label; inactive muted. Glass chrome: bg glass, blur 20px,
  hairline top border (1px). Icons: sun-spark, waveform/mic, radar, flame, person.
- tab-page header component: glass, hairline bottom, title-1 left, up to 2 ghost icon
  buttons right (theme toggle is one; it sets data-theme on <html>). You do NOT need to
  implement theme logic — render the toggle button and aria-label.
- Layout: <main> with max-w-[480px] mx-auto, px-4, bottom padding ≥ calc(12px +
  safe-area-inset-bottom + 64px) so content never hides under the tab bar. Keep an
  <Outlet/> socket (react-router).
- Progress tab hosts a small segmented header switching /streak, /leaderboard, /history;
  Profile tab hosts /settings, /billing, /referral. Tabs stay selected while inside a
  tab's sub-routes (use NavLink).

Return: tab-bar.tsx, page-header.tsx, and app-shell layout component (react-router
Outlet). Include skeleton, empty, error slots where this shell shows them.
```

---

## GROUP 2 — ONBOARDING & AUTH

```
Context: Master System Prompt active. Generate all onboarding + auth screens. All are
full-bleed (no tab bar). Centered column max-w 400px, primary action bottom, clear of
home indicator. Dark first, light twin. Shared: centered brand mark (gradient 13px "K"
lockup), micro-caps subtitle, 52px inputs radius 12 hairline->brand ring, focus-visible.

Return these pages (react-router paths):
1. /login "Welcome back" — email, password (eye toggle), primary "Sign in" bottom + safe-
   area pad, "Forgot password?" right-aligned above, "Create an account" secondary below.
   Error = red banner above the button (generic, no leak).
2. /register — name, email, password with 4-segment strength bar + mono micro checklist
   (length, uppercase, lowercase, digit, special), confirm password live mismatch hint,
   "I agree to the Terms of Service & Privacy Policy" checkbox w/ inline link, Turnstile
   placeholder card (self-contained, aria-labeled), primary "Create account".
3. /forgot-password — title, "We'll email a reset link (valid 1 hour).", email field,
   primary "Send reset link". Success swaps to a success panel (icon + "If that email
   exists, a link is on its way.") + "Back to sign in".
4. /reset-password — reads ?token= (my hook getQueryParam). Password + confirm w/
   strength meter. Success: check icon + "Password updated. Redirecting…"; invalid token:
   red panel + "Request a new link".
5. /verify-email — reads ?token=, auto-verifies once. Three centered states with the
   status-icon component: working = 24px brand spinner + "Verifying your email…"; ok =
   brand check + "Your email is verified. Taking you to sign in…" (auto-nav 1.6s);
   error = danger icon + readable message + "Back to sign in" + "Didn't get a link? Sign
   in and resend it from your dashboard."
6. /onboarding — 4-step wizard (hairline stepped indicator, brand fills current). Step 1
   Welcome: display title, 3 bullet feature rows, primary "Get started", ghost "Skip for
   now". Step 2 Goal: 2x2 selectable cards (Campus placements / Off-campus jobs / A
   specific company / Freelancing), selected = brand fill + white text + check. Step 3
   Level: 3 vertical radio cards (Beginner/Intermediate/Advanced + desc). Step 4 Topics +
   reminder: 7 category chips multi-select (tag colors per tokens) + time-input tile.
   Step 5 Confirm: summary rows + primary "Start prepping" + back. Loading skeleton on
   save; error banner on fail.
7. /invite/:code — transient: brand mark + micro "Setting up your referral", auto-nav to
   /register. (stored code via localStorage kairos_referral_code)

Reuse shared AuthShell + Field + PasswordField. Return all pages + shared form primitives.
```

---

## GROUP 3 — DASHBOARD & PRACTICE (the core daily loop)

```
Context: Master System Prompt active. This is the heart of the app — the daily answer loop
and the voice-recording flow. All inside the app shell (tab bar, no tab header where the
screen is immersive). Dark first, light twin.

Return these pages:
1. / "Today" — streak pill (flame + "N day streak · longest M", hairline, ghost). Question
   card: category + difficulty tags (token colors) then question title-2. Answer card:
   140px textarea, placeholder concrete, mono micro "Minimum 20 characters", primary
   "Submit answer" full-width bottom (disabled <20 chars). Submitting/evaluating: spinner
   + mono token-stream pill (auto-scroll, brand caret) in surface-2 well. Already answered:
   display "You're done for today" + streak + link to today's result. Error -> banner +
   "Try again".
2. /practice — PICK state: title "Practice mode" + mono micro subtitle; chip grid:
   "Surprise me" + 7 category chips (token colors); tap = loading skeleton. LIVE state:
   category tag + "Change topic" ghost top-right; segmented control Type | Speak.
   Type: 140px textarea + "Skip question" ghost + "Submit answer" primary.
   Speak: voice card — idle: 56px mic circle + "Start recording" + micro helper
   ("Speak 2 minutes, as in a real interview"). Recording: tinted panel, pulsing 10px red
   dot, mono title timer "REC 0:00" ticking, thin budget progress (brand -> amber past
   100s), primary "Stop & evaluate". Stage updates (Uploading/Transcribing/Evaluating):
   thin spinner + mono micro status. Mic errors (denied/no mic/in use): short message +
   "Change topic", never raw errors.
3. result components (shared, also used at /history/:id):
   - AnswerResultView: question card, score pill colored + label (Strong/Solid/Keep
     practicing) + "Practicing N days in a row" micro; "Your answer" card; "Feedback"
     card (clear headers/bullets); "Model answer" in surface-2 well. Failed eval ->
     banner + retry.
   - VoiceResultView: overall band + duration micro; 3-col dimension grid Content/
     Structure/Delivery w/ band tags; delivery metrics mono micro row (wpm ·
     fillers/min · speaking% · pauses); brand-1 "Next step" card (white text); "What
     worked" / "What to improve" lists; transcript <details> ("Show transcript/Hide").
   - FollowUpCard: "Next up" micro + suggested question + weak-area tag + "Practice this"
     primary.
Return all; every state (loading/empty/error/streaming) present.
```

---

## GROUP 4 — PROGRESS & SOCIAL

```
Context: Master System Prompt active. App shell pages. Dark first, light twin.

Return:
1. /skills — Radar card: SVG 10-axis radar, brand-1 fill 15%, mono micro axis labels,
   vertex dots; breakdown rows: name + category tag, brand progress bar + numeric score
   + trend chip (arrow shape + color, never color-only: ▲/▼/→). Empty: line-icon + "Do a
   few practice questions to grow your radar." ShareCard (shared): gradient brand-1->2,
   initial avatar, flame streak, top strong skills list, Twitter/LinkedIn/Copy actions.
2. /streak — hero display number (current streak, display weight, flame), mono micro row
   "day streak · longest M · freezes N", explanatory micro line; "Refill weekly freeze"
   primary (disabled at 1+); "Last week" card: answered · avg /10 · focus area (weakest
   category); "How it works" 3 bullets. All states incl. no-data week.
3. /leaderboard — "You're ranked #N this week." table: rank mono · name/"Anonymous" ·
   answers · avg · streak+flame; your row = subtle brand tint + "You" tag. Empty: "No
   completed answers yet this week. Be the first!" Error -> retry.
4. /history — title + micro subtitle; rows: category+difficulty tags, question 2-line
   clamp, date micro + score pill OR status; chevron; mono "Load more"; empty state +
   "Answer today's question" CTA; "Back to today" link.
5. /history/:id — back chevron + "History"; loading skeleton; delegate to
   AnswerResultView or VoiceResultView by type; error "Result unavailable" + retry.
Return all five + shared leaderboard-row card.
```

---

## GROUP 5 — ACCOUNT & BILLING

```
Context: Master System Prompt active. App shell pages, Profile tab subtree. Dark first,
light twin. Grouped cards with mono micro-caps group headers.

Return:
1. /settings — groups: APPEARANCE (segmented Light | Dark | System + "Currently using X"
   — render as segmented, no logic). NOTIFICATION PREFERENCES (3 switches: push
   notifications, answer-evaluated alert, daily streak reminder + time tile + "Save
   preferences" primary; toast on save). BROWSER NOTIFICATIONS (state row: blocked/idle/
   subscribed + Try again/Turn off). ACCOUNT STATS (4-grid: answers · current streak ·
   longest · member since). CHANGE PASSWORD (current, new + strength, update; success
   notice "Changed. Signed out everywhere else."). YOUR DATA ("Download my data (JSON)"
   ghost). DANGER ZONE (red hairline card: mono micro "This action is irreversible.",
   input must contain DELETE_MY_ACCOUNT to enable "Permanently delete my account"
   danger button).
2. /billing — current-plan banner (Pro: renewal date + "Cancel subscription" danger
   ghost); plan cards Free (3 evals/day · 10 voice min/day · skills tracking · streaks)
   and Pro ₹9.99/mo (unlimited evals · unlimited voice · full analytics · priority
   support) with check list, current = disabled "Current plan", upgrade = primary
   Razorpay. Footnote "Payments via Razorpay · cancel anytime." ?billing=success refresh
   toast. Loading skeleton + error alert.
3. /referral — "Invite friends" + micro subtitle; two reward tiles ("7 days you earn" /
   "3 days friend earns"); links box (mono code + "Copy" -> "Copied!" 2s); stats row
   "Friends invited: N · Remaining uses: N". Loading + error states.
```

---

## GROUP 6 — READING / MARKETING

```
Context: Master System Prompt active.

Return:
1. / "*" public Landing — sticky glass navbar (brand + "Log in" ghost + "Get started"
   primary). Hero: display headline "Ace your next interview. One question a day.",
   subtitle (16 muted), primary "Start practicing" + mono micro "Free forever. No credit
   card." 6 feature cards (daily question · voice practice · skills radar · adaptive
   difficulty · streaks · follow-ups) w/ line-icon tiles. Pricing 2 cards (Free vs Pro
   ₹9.99/mo). Footer: © year + Terms + Privacy + mailto support. Hairline section
   separators, immersive vertical rhythm, optional editorial display serif word in hero.
   Nav hidden once logged in (render a prop authenticated:boolean) — do not implement auth.
2. /terms and /privacy — typographic legal pages: mono micro "Last updated: August 26,
   2026", title-1, 16px body / 1.5, back link. RED TEXT-ONLY STYLE — my system parses
   your JSX to mark prose; you must keep the full legal content as React <p>/<section>
   text and NOT invent or trim clauses. I will supply the exact body if asked.
```

---

### Post-processing checklist (run yourself, then hand over)

- Every route above maps to a real `react-router` path in `apps/web/src`.
- Put shadcn primitives in `@/components/ui/<name>.tsx`, app components in
  `@/components/<name>.tsx`, pages in `@/pages/<name>.tsx`.
- After receiving all groups, wire-in steps (separate task): `@tailwindcss/vite` plugin,
  `@theme` block from tokens, swap `styles.css` for Tailwind, rebuild `Layout.tsx` as the
  Group-1 shell, then port each page onto its live data hook (`api.today()`, `api.streak()`,
  `api.history()`, `api.skills()`, `api.today()` evaluation streaming, voice submit + SSE).