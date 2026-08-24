# Kairos Mobile — Design System

Reference doc for the Kairos mobile design. Pairs with `kairos-mobile-screens.html` (interactive prototype), `kairos-flow-diagram.html` (navigation map), and `kairos-antigravity-prompt.md` (build instructions). This file is the "why" behind those three, keep it as the source of truth if the visual language needs to evolve.

## Concept

Kairos (καιρός) is the Greek word for the right, opportune moment, as distinct from chronos, clock time. The product's core mechanic is a single deterministic challenge that exists for exactly 24 hours. The design leans into that: an instrument-panel language built around one signature motif, a circular dial that marks a precise point in time or performance, rather than a generic productivity-app look.

Two things the design should never become:
- A generic dark SaaS dashboard (card grid + one accent color + no point of view)
- A gamified streak app that leans on badges/confetti/mascots

## Color

Two named accents, each with one job. Do not use them interchangeably.

| Token | Dark | Light | Use |
|---|---|---|---|
| `bg` | `#0A0E13` | `#F1F1EE` | screen background |
| `surface` | `#141A22` | `#FFFFFF` | cards, inputs |
| `surface-2` | `#1B222C` | `#F7F6F2` | nested surfaces, track fills |
| `text` | `#ECEFF3` | `#181C22` | primary text |
| `text-dim` | `#8A93A1` | `#6B7280` | secondary text, captions |
| `line` | `#232B35` | `#E3E2DC` | borders, dividers |
| `accent` (amber) | `#E8B84B` | `#C6862A` | primary CTAs, the "today" ritual, streaks, urgency |
| `accent2` (teal) | `#4FC2B8` | `#2E8F86` | AI evaluation, analytics, model-answer content |
| `danger` | `#E8735F` | `#C6482F` | low scores, destructive actions |

Rule of thumb: if it's about *doing today's thing*, it's amber. If it's about *the system judging or analyzing your work*, it's teal. A screen should never need both as primary at once, one accent leads per screen.

## Typography

| Role | Face | Where |
|---|---|---|
| Display | Space Grotesk (500–700) | screen titles, headings |
| Body | Inter (400–600) | paragraphs, labels, buttons |
| Mono | IBM Plex Mono (400–600) | anything numeric or time-bound: scores, streak counts, timers, timestamps, category codes |

The mono face is doing real work, not decoration: it's the tell that separates "a number that measures something" from "a word." Use it consistently for every score, percentage, and countdown, and nowhere else.

Type scale (approximate, mobile):
- H1 / screen title: 24–26px, Space Grotesk 700
- H2 / section: 16–18px, Space Grotesk 600
- Eyebrow / label: 10.5–11px, mono, uppercase, letter-spacing .12–.14em, set in accent color
- Body: 13.5–14.5px, Inter 400
- Caption / muted: 11–12px, Inter 400, `text-dim`

## Layout and spacing

- Base unit: 4px. Common paddings: 10, 14, 16, 20.
- Card radius: 16px (`--radius-md`). Small controls: 10px. Screen-level containers/sheets: 26px.
- Cards use a 1px `line` border, not shadow, to separate surfaces in dark mode. Shadow is reserved for the phone frame / elevated overlays only, not everyday cards.
- Category grid: 2 columns, grouped under mono eyebrow section labels (Core, Full Stack, Modern Tech, Professional), not one flat list of 19.

## The signature element: the moment ring

One circular progress ring component, reused with different fills and center content in three places:

1. **Home**: amber fill, ring shows time remaining until the ritual resets, center shows category + challenge title.
2. **AI Evaluation**: teal fill, ring shows score out of 100, center shows the number.
3. **Progress**: teal fill, same ring language rendered as a radar/skill-map polygon rather than a single arc, representing multi-dimensional score instead of one value.

Keep stroke width (9–10px), round line caps, and rotation/animation easing identical across all three. If a fourth use case comes up (for example a subscription/usage meter), it should use this same component, not a new chart style. The point of the motif is that a user learns to read "ring = a moment being measured" once and recognizes it everywhere.

## Components

- **Primary button**: full-width, accent fill, `accent-ink` text (near-black on amber), 700 weight, 10px radius. One per screen, reserved for the single most important action.
- **Secondary button**: outline only, `line` border, transparent fill. Used for the lower-priority of a two-button pair (e.g. "Back to Ritual" next to "View History").
- **Pill / chip**: `surface-2` fill, `line` border, mono text, used for streaks, category tags, timers, i.e. small stateful facts, not for navigation.
- **Score chip**: fixed 38x38 rounded square, mono number, tinted by score (teal for strong, amber/danger for weak), used in History rows.
- **Cards**: `surface` fill, `line` border, 16px padding, 16px radius. Nested stat cards inside a row use equal flex and centered mono numerals.
- **Bottom tab bar**: 5 items (Home, Practice, Progress, History, Profile), persistent across those five screens only. Active state is amber icon + label, inactive is `text-dim`. Onboarding, Auth, Answer, and Evaluation are pushed screens without the tab bar.

## Motion

Kept deliberately restrained:
- Ring fills animate on screen entry (arc/polygon draws in), this is the one "hero" motion moment per screen.
- Screen-to-screen transitions are standard native push/pop, no custom choreography.
- No decorative motion (parallax, floating elements, hover-style micro-bounces). The instrument-panel feel comes from precision, not liveliness.

## Light and dark mode

Both are first-class, not a dark-mode-first afterthought. Light mode keeps the same warm-neutral-plus-two-accents structure: a soft warm-gray background (`#F1F1EE`, not pure white) so surfaces (`#FFFFFF`) still read as elevated. Toggle lives in Profile → Preferences → Appearance; system theme is the default on first launch, explicit choice persists after that.

## Voice and copy

- Buttons name the action, not a generic verb: "Start Today's Challenge," "Submit for Evaluation," not "Continue" or "Submit."
- The evaluation screen speaks like the grader, plainly and specifically: "Strong grasp of trade-offs, thin on distributed state," not "Great job!" It should always name what was strong and what was weak, never one without the other.
- Streak and ritual language treats the daily challenge as a fact of the system, not a nag: "Resets in 07:14:02," not "Don't break your streak!!"
- Empty states (e.g. no history yet) should read as an invitation to act, stated plainly: what's missing and the one action that fills it, not an apology.

## What this system explicitly avoids

- Default AI-generated-design tells: cream background + terracotta accent, or a single acid-green-on-black accent, or a hairline-newspaper broadsheet layout. None of these fit an instrument/ritual concept.
- Badge/trophy gamification iconography. Progress is communicated through the ring and skill map, not medals.
- Numbered-step decoration where the content isn't actually sequential (e.g. the category grid is grouped, not numbered, since categories aren't a process).
