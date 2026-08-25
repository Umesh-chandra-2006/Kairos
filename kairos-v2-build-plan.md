# Kairos V2 — Amended Build Plan (Validated Sequencing)

**Author:** Umesh Chandra · **Date:** 25 Aug 2026
**Status:** Authoritative engineering + product plan for V2. Supersedes the raw
GPT audit ("Kairos V2 — Engineering & Product Build Plan") where they differ;
incorporates the strategic follow-up memo (adaptive follow-ups, evidence-first,
preserve-V1), all corrections from `kairos-v2-brutal-research.md`, and the
17-point Engineering Addendum (dispositions logged in §16). Implementation-ready.
**Companions:** `kairos-v2-strategy.md` (thesis) · `kairos-v2-brutal-research.md`
(market verdict) · `documentation.md` (current system).

---

## 0. How this plan differs from the raw audit

| # | Audit said | Amendment | Why |
|---|---|---|---|
| 1 | 10 sequential sprints, validation implied at the end | **Wave 0–4 sequencing**: thin slice ships in weeks 2–4, pilots run concurrently with deeper builds | The behavioral kill test must run *inside* the build, not after it |
| 2 | No sales motion anywhere | **Wave 0 founder track**: 2 signed college pilot agreements are a launch gate | Brutal research: "will a college pay ₹500/student" is the real bottleneck; engineering cannot substitute for it |
| 3 | Qualitative kill gates ("extremely low") | **Numeric, pre-committed gates** (§9) decided before launch | Pre-committed numbers were the best discipline in the v1 docs; restore them |
| 4 | Calibration set is Phase 16 (late workstream) | **Labeling queue runs from day one of pilots**; benchmark grows organically from pilot answers | The calibration set *is* the moat; it cannot materialize later on demand |
| 5 | Repo cleanup: remove tRPC, rename `claude.ts` | **Dropped — neither exists in this repo** (verified). Refactor only opportunistically when adding new domains | The audit's repo claims were generic-template artifacts |
| 6 | Full multi-tenancy + 5-role RBAC in Sprint 7 | `collegeId` scoping + read-only TPO dashboard first; generalize when a 2nd college signs | Zero institutional customers today; RBAC is premature |
| 7 | 30–50 skill taxonomy with confidence modeling | **Start with 8–12 dimensions** (~30 reps/season spread over 40 skills = n≤2 cells = noise theater) | Confidence math needs data volume we don't have yet |
| 8 | Language policy unaddressed | **English-only enforcement is a locked product constraint** | Hinglish WER 27–70% across all 2026 models — an unsolved problem we opt out of |

Everything else in the audit's architecture (modality-split evaluators,
evaluation versioning, signed uploads, state machine, idempotency, benchmark
harness, phased data model) is adopted as-is.

---

## 1. Non-negotiable product principles

1. **Kairos is adaptive interview training, not an AI interviewer.** AI is the
   evaluator/reasoning layer, not the product.
2. **One relevant 90-second spoken rep daily → trustworthy evaluation → one
   actionable improvement → adaptive next rep.**
3. **The spoken performance record is the primary data asset.** Store structured
   evidence from every attempt: transcript, timing, delivery metrics, content/
   structure evaluations, strengths, weaknesses, concepts demonstrated/missed,
   next action, historical skill state.
4. **Never one LLM score as source of truth.** Content → LLM + structured
   rubric. Structure → LLM + deterministic transcript features. Delivery →
   ASR/DSP deterministic only. Aggregate to bands.
5. **Evidence beats claims.** Never emit a number without the why. Every
   conclusion links back to the evaluation/transcript/metrics that produced it:
   *What Kairos thinks → why it thinks that → what to do next.*
6. **Personalization over content volume.** A small structured question graph
   with variants beats a 20,000-question bank.
7. **The college is the buyer; the student is the daily user.**
   Institution → cohort → student → reps → performance → skill state →
   readiness → interview outcome → placement outcome.
8. **No fake precision.** "Frequent long pauses," never "confidence = 82.3."
   Observable signals, not psychological traits.
9. **Do not rewrite working infrastructure for aesthetics.** See §2.

## 2. Preserved V1 foundations (do not touch)

The current `develop` branch made deliberate architectural choices. These stay:

- Monorepo (`apps/api`, `apps/web`, `apps/mobile`, shared packages)
- Drizzle + MySQL; Express API + zod validation
- Redis/BullMQ async evaluation (+ in-process fallback) and SSE streaming
- Refresh-token/session architecture (rotating families, reuse detection)
- Daily assignment persistence; notification outbox pattern
- Shared zod schemas/types; existing authn/authz
- All existing V1 functionality remains stable while V2 lands incrementally

V2 extends the domain model around spoken performance; it does not replace the
platform. "Do not merely bolt voice onto V1" means redesign the *domain*
(reps, evidence, skills), not rewrite the plumbing.

## 3. What Kairos is NOT

Not an AI chatbot, AI interviewer, random question bank, mock-interview
simulator, or streak/gamification app. Not a live-interview copilot. Not an
aptitude/OA content business. Not a subscription a student pays for — the
institution pays.

## 4. Locked product constraints (decided now, not deferred)

| Constraint | Decision |
|---|---|
| **Language** | **English-only answers enforced conservatively.** Detection pipeline: language/code-switch detection → clearly unsuitable? → no: evaluate normally / yes: soft rejection with retry. Never let an LLM arbitrarily reject an answer for containing a few Indian-language words, and never penalize normal Indian-English speech patterns — but do not grade a recording that cannot be reliably transcribed. Log `language_detected`, `code_switch_probability`, `rejection_reason` so we can measure whether this constraint causes unnecessary friction (reviewed at weekly pilot gate reviews). Rationale: Hinglish WER 27–70% (2026) would poison delivery metrics and grades. |
| **Rep length** | 90-second hard cap, never raised. Follow-ups may extend a *session* but each recorded take stays ≤90s. |
| **Grading output** | Three bands × three dimensions + exactly one primary next action. No 1–10 score exposed. |
| **Delivery measurement** | DSP/ASR timestamps only. The LLM never measures delivery (cannot hallucinate pauses/fillers). |
| **Audio storage** | Raw audio auto-deleted after configurable retention (default: season + 90d); derived features retained. Consent record at enrollment; deletion workflow required. |
| **WhatsApp role** | Reminder/prompt/deep-link channel riding **college-owned broadcast groups** wherever possible — never our own marketing-template daily pushes (~₹0.78–0.86/msg + Jan 2026 hike ≈ ₹23+/student/season, plus Meta quality-block risk). Recording always happens in-app/PWA. |

## 5. Adaptive follow-ups (the reasoning-under-pressure requirement)

Kairos must eventually measure whether a candidate can *reason under pressure*,
not just whether the first answer was right:

- explain their reasoning; defend a decision when challenged; handle a
  follow-up; adapt when a constraint changes; demonstrate understanding vs.
  recognition/memorization; recover from an incorrect initial answer.

Loop shape:

```
Question → answer → detect weakness → ONE targeted follow-up
        → response → re-evaluate (both takes feed evidence)
```

Implementation rules for v2.1+:

- First version: **at most one carefully selected follow-up** per rep, chosen
  when the evaluator flags meaningful uncertainty or a misconception (rubric
  `misconceptionSignals` or low evidence coverage).
- Schema hooks from day one: submissions carry `kind ∈ {initial, follow_up}`
  and `follow_up_of`; evaluations link to both takes so evidence chains stay
  intact.
- When capacity allows, prefer scheduling the follow-up as **tomorrow's rep**
  (same concept, harder variant): preserves the 90s cap, strengthens the
  adaptive-return loop, and halves same-session latency/cost.
- No full mock interviews until the single-follow-up loop is proven.

## 6. Evaluation architecture (adopted from audit, unchanged)

```
AIProvider abstraction: OpenRouterProvider | OpenAIProvider | MockProvider
Evaluator abstraction:
  ContentEvaluator  — LLM vs structured rubric (evidence tokens, must-mention,
                      misconceptions). Model may not invent criteria.
  StructureEvaluator— LLM reasoning + deterministic transcript features
                      (directness, organization, repetition, conclusion).
  DeliveryEvaluator — ASR word timestamps + DSP only: duration, speaking time,
                      pause distribution, filler rate, speech rate.
Aggregator → 3 bands + ONE next action (rule-based selection from weakest band).
Evaluation versioning (mandatory, every row):
  model, provider, modelVersion, promptVersion, rubricVersion,
  evaluatorVersion, createdAt.
```

### 6.1 Canonical Evaluation Contract (Wave 0)

One shared, versioned zod schema in `packages/shared` defines the complete
evaluation result. No evaluator invents its own output shape:

```text
Evaluation
├── content:    { band, evidenceFound[], missingEvidence[],
│                misconceptions[], strengths[] }
├── structure:  { band, directness, organization, repetition, conclusion }
├── delivery:   { band, speechRate, pauseMetrics, fillerRate, speakingRatio }
├── overallBand
├── nextAction            (exactly one)
└── evidenceRefs[]
```

Rules:

- Every field explicitly typed; every evaluator validates its output against
  the contract before anything is persisted.
- **Model-generated vs deterministic fields carry an explicit source tag** —
  downstream consumers can always tell which is which.
- The aggregator consumes validated evaluator outputs, never raw model
  responses. Invalid model output fails safely (retry → dead-letter) and is
  never persisted as a valid evaluation.
- **Provenance:** every meaningful conclusion resolves through a chain:
  `conclusion → evidenceRefs → evaluation → transcript segment / timestamp
  range / rubric evidence-token`. E.g. "Missing explanation of index
  selectivity" traces to the content evaluation → transcript segment → rubric
  token; "frequent long pauses" traces to the delivery evaluation → timestamp
  range + deterministic metric. No opaque score pipeline.

### 6.2 Bands are the canonical backend model

The backend stops treating the single 1–10 score as fundamental — this is not
merely hidden in the UI. Canonical result = three dimension bands + overall
band + one next action. Legacy V1 scores survive only through the planned
dual-read/migration path and are marked deprecated at the type level; all new
V2 evaluations persist bands only.

Anti-sycophancy stance retained: the honest grader is the brand, and the
calibration harness (§8 Wave 1 exit criteria, §9 gates 6–7) is what makes the
claim real instead of marketing.

## 7. Question model (small graph, high structure)

Per-question metadata: `role, company, roundType, topic, subtopic, conceptTags[],
difficulty, questionType, season, isActive, isPracticeOnly` + structural rubric
(`evidenceTokens[], mustMention[], goodSignals[], weakSignals[],
misconceptionSignals[], structureExpectations[]`) + **variants** per concept
(kills canonical-answer memorization).

Seed with the existing 450-question bank re-tagged progressively — do not
author volume. **Pool gating: questions lacking adequate rubric metadata
(evidence tokens, must-mention, misconception signals…) never enter the
adaptive-selection pool.** Quality of the question graph matters more than its
size.

Adaptive selection arrives only after the competency engine exists (Wave 3),
using a deterministic scoring function (weakness + role/company fit +
difficulty fit + recency/repetition penalties + skill coverage) — explainable
and tunable before any ML. No learned/RL models until sufficient behavioral
data exists. The selector must be able to explain itself: *"This question was
selected because your DBMS explanation has been weak across your last three
reps and this targets that concept at an appropriate difficulty."*

## 8. Execution plan — Waves, not sequential sprints

### Wave 0 — Stabilize + Sell (weeks 1–2, parallel tracks)

**Engineering (only what the voice loop depends on):**

- Answer submission idempotency (`idempotencyKey`; reserve row atomically
  before any LLM call; return existing state on replay)
- Explicit submission state machine: `created → queued → processing →
  completed → failed | cancelled` (no null-field inference)
- Worker idempotency contract: completed evaluation ⇒ no-op; another worker
  owns the active evaluation ⇒ skip; otherwise **atomically claim → evaluate →
  persist → mark completed**. A BullMQ retry must never duplicate billing,
  overwrite a completed result, or duplicate evidence/analytics/skill updates
- Two-layer rate limiting (per-user + per-IP)
- **Feature flags for V2 capabilities**: `voice_v2, new_evaluator,
  delivery_metrics, adaptive_followup, skill_engine, adaptive_question_selection,
  tpo_dashboard, whatsapp`. Enabled per environment and per college
  (`collegeId`; per-cohort targeting waits for Wave 4 tenancy — no cohort
  entity exists before then). Disabled flags leave V1 flows completely
  untouched; rollback never requires a code deployment
- Error contract: internal diagnostics + user-safe message + retryability flag
- Evaluation versioning columns + migration of legacy 1–10 rows (dual-read)
- Event instrumentation for the funnel (see §10) — without this there is no D7
- Provider/Evaluator abstractions + MockProvider (tests run keyless)

**Founder track (runs in parallel, non-delegable):**

- 2 college pilot agreements signed (₹500/student, 100–300 students each,
  named start date). LOIs acceptable to *start* integration; payment or signed
  PO before Wave 3.
- TPO intake interviews: how they'd deploy, what report they'd renew on.

**Exit criteria:** state machine + idempotency merged behind tests; funnel
events firing; 2 signed pilots with dates. If zero colleges will sign by end of
week 2 after honest outreach, stop and revisit positioning before building.

### Wave 1 — Voice Rep thin slice (weeks 2–4) = audit Milestones A+B

Vertical slice, one loop, no platform:

1. Recorder PWA/mobile screen: mic permission, level check, 90s hard cap,
   timer, retry, cancel; English-only notice; "no one hears this but the AI"
   privacy copy; device-tier completion tracking.
2. Upload: direct-to-API initially (90s ≈ ≤1MB is fine at pilot volume);
   schema already carries `storageKey, mimeType, durationMs, sizeBytes,
   sampleRate, checksum`. Domain code talks to an **AudioStorage interface**
   (`put/get/delete/exists`) with two implementations — `PilotStorage`
   (API-local disk) now, `ObjectStorage` later — so the Wave 4 signed-URL/
   object-storage migration is a configuration change, not a domain rewrite.
3. ASR stage (separate worker stage, Whisper-class en-IN model): transcript +
   word timestamps + confidence; persisted as derived artifact linked to the
   recording.
4. Deterministic delivery metrics from timestamps/DSP (§6 DeliveryEvaluator).
5. Three evaluators → aggregator → **bands + one next action** rendered on the
   result screen (replaces/augments the 1–10 display; web + mobile).
6. Labeling queue: every completed rep enters a review table; student confirms
   band ("Was this fair? 👍/👎 + optional comment"); TA/TPO spot-check UI later.

**Exit criteria:** one real student completes a genuine 90-second rep E2E and
gets bands + one actionable next step; band-flip blind re-score harness running
in CI against a seed benchmark set — base fixtures (excellent/good/weak/rambling/
wrong/memorized/off-topic/too-short/too-long) **plus adversarial cases**
(prompt injection, confident-but-incorrect, correct-but-poorly-structured,
technically-shallow-but-fluent, excellent-content/poor-delivery,
poor-content/excellent-delivery). This suite is permanent CI regression:
every evaluator/model/prompt/rubric change runs against it, tracking band
changes, dimension changes, invalid outputs, and unexpected regressions —
evaluator behavior becomes measurable rather than intuitive.

### Wave 2 — Pilots + Calibration (weeks 4–8)

- Deploy to the two pilot cohorts; weekly gate review against §9 numbers.
- Calibration set grows from pilot data: target ≥150 human-anchored answers by
  week 8 (student confirmations + weekly TPO/TA spot-check batch).
- Minimal TPO surface: **read-only**, scoped by `collegeId`, answering four
  questions — who is practicing (activation/completion), who is improving
  (trend), cohort-weak skills, which students need intervention — plus one
  aggregate: **Placement Readiness Trend**, a drillable longitudinal indicator
  over validated dimensions ("cohort readiness ↑12% over 4 weeks; driven by
  technical-explanation and structure gains; primary weakness:
  system-design articulation"). Explicitly *not* a placement probability until
  outcome data justifies such a model; every aggregate drillable into
  underlying evidence. No heatmaps-by-everything, no exports, no RBAC framework.
- Outcome fields collected from **day one** of pilots: interviews attended,
  companies, rounds reached, results, offers (self-report + TPO import).
  Retroactive collection is impossible — this feeds the only evidence that
  changes everything (practicing cohort vs. control round-pass rate).
- Control design: staggered activation across sections/departments gives a
  natural comparison group; define comparable-cohort rules up front.
- **Authorization isolation tests in CI** (cross-tenant matrix, including
  direct object-ID access — never only UI flows): College-A TPO → College-A
  student allowed; College-A TPO → College-B student forbidden; student A →
  student B's evaluation forbidden. The frontend is never trusted to enforce
  institutional privacy. Boundaries written cleanly enough that Wave 4
  tenancy generalization is additive, not a rewrite.

**Exit criteria:** numeric gates reviewed; go/no-go per §9.

### Wave 3 — Skill intelligence (weeks 8–12) = audit Milestone C, gated

Only if Wave 2 gates pass:

- Skills taxonomy v1: **8–12 dimensions** (e.g., technical explanation,
  structure, conciseness, DBMS, DSA communication, OS/CN fundamentals-articulation,
  composure-under-pauses, closing/conclusion). Expand only with data.
- `user_skill_state` (score, confidence, evidenceCount, lastAssessedAt, trend)
  + `skill_evidence` (every conclusion linked to its evaluation/transcript).
  Confidence displayed honestly ("2 data points — early signal").
- Adaptive `QuestionSelector` (deterministic scoring function) replacing random
  practice draws; anti-repetition; target-role weighting from onboarding data.
- One-follow-up mechanism (§5), scheduled as next-day rep where feasible.

**Exit criterion:** "Kairos stops behaving like a random question generator" —
next-rep choice demonstrably driven by weakness/skill state.

### Wave 4 — Institutional layer + hardening (post-validation)

- Second-college onboarding ⇒ generalize tenancy (orgs/cohorts/RBAC) only now.
- Placement-outcome linkage and the first credible institutional outcomes
  report (correlation framing, defined cohorts, no causal claims).
- Signed-URL object storage + lifecycle rules; load testing; queue reliability
  drills; monitoring + cost dashboards (§12); security/privacy review;
  backup/restore drill; WhatsApp reminder flow via college broadcast groups.

## 9. Kill gates — numeric, pre-committed (decided before pilot launch)

Behavioral (per pilot cohort, measured from funnel events):

| # | Gate | Threshold | Miss means |
|---|---|---|---|
| 1 | D7 voice-rep retention | ≥40% of activated students | The daily spoken rep doesn't exist as a habit → pivot interaction design, don't add features |
| 2 | D30 retention | ≥25% | Same |
| 3 | Weekly completion through wk 12 | ≥60% of actives complete ≥4 reps/wk | The core loop isn't compelling enough to be the wedge |
| 4 | Reps / active student / week (median) | ≥3 | Friction or value problem — diagnose before scaling |
| 5 | Genuine-take rate | ≥90% of started reps record full-length audio | 90s voice is too burdensome → interaction redesign |

Trust/calibration:

| # | Gate | Threshold |
|---|---|---|
| 6 | Human–AI band agreement on calibration set | ≥85% |
| 7 | Blind re-score band-flip | ≤15% |
| 8 | Student "feedback was useful" rating | ≥4/5 average, ≥60% responding |

Commercial:

| # | Gate | Threshold |
|---|---|---|
| 9 | TPO engagement | Dashboard logins ≥50% of pilot weeks; ≥1 renewal conversation initiated by the college |
| 10 | Conversion | ≥1 college pays/renews at ₹500+/student within 90 days of pilot start |

Outcome (instrumented from day one, judged later):

> **The decisive dataset:** practicing cohort vs. comparable control on
> round-pass/interview-conversion rate, ≥20 reps minimum dose. Nobody in this
> category has ever published it. Collect from Wave 2; expect to judge it one
> placement season later.

Any two behavioral misses ⇒ stop feature work, diagnose, redesign the loop.
Gate 10 miss with passing behavior gates ⇒ distribution problem, not product —
shift effort to the founder track. All misses ⇒ thesis retires with data;
total spend stays under the $5k envelope.

## 10. Instrumentation (build in Wave 0, non-negotiable)

Two distinct layers — product analytics and system observability. Both are
required; neither substitutes for the other.

**Product analytics** ("are students using Kairos?") — server-side funnel
events, one table + worker drain: `rep_started, recording_completed, submitted,
evaluation_completed, result_viewed, next_action_shown, followup_delivered,
band_confirmation, session_return, tpo_login, outcome_selfreported`. Derived
daily rollups power every §9 gate. No third-party dependency for the kill test.

**System observability** ("is Kairos functioning reliably?"): API latency ·
queue depth & wait time · worker failures & retries · ASR latency & failures ·
LLM latency & failures · evaluation E2E latency · SSE disconnects · upload &
storage failures · AI token usage & cost · cost per completed rep.

## 11. Privacy / security / DPDP (designed before broad voice deployment)

- Consent record at enrollment; plain-language purpose statement
- Encrypted audio at rest; signed access URLs (Wave 4); auto-delete raw audio
  post-retention (season + 90d default); deletion workflow (recording/account)
- Tenant scoping by `collegeId` until multi-tenancy generalizes; TPO sees only
  their cohort; **student-controlled visibility toggle** for what the TPO sees
  (retained from strategy §5.1)
- Audit log for institutional access; export + erasure endpoints
- Treat transcripts as sensitive; store only what grading requires
- **Recording lifecycle is tested, not just documented** (CI-covered):
  recording → retention expiry → automatic raw-audio deletion while derived
  metrics persist; student-initiated deletion → raw audio deleted always,
  transcript deleted where policy requires, linked evidence handled per
  retention rules, legally necessary audit records retained; account deletion
  leaves zero orphaned voice artifacts
- India-region hosting preferred for ASR processing; provider DPAs reviewed

## 12. Cost architecture (corrected numbers)

| Item | Planning figure | Source |
|---|---|---|
| ASR per 90s take | ₹0.4–0.75 | OpenAI/Sarvam pricing — trivial, retired risk |
| LLM grading (multi-judge) | $0.01–0.02/answer landed | Strategy §5.3 |
| Storage | negligible at pilot scale | — |
| WhatsApp reminders | **₹23+/student/season if WE push templates** — avoid via college groups | Brutal research §2.4 |
| Instrument from Wave 2 | cost/completed rep, cost/active student, cost/college/season | Required for ₹500–1,500 pricing integrity |

**₹500–1,500/student/season is a pricing hypothesis, not validated pricing —
do not hard-code it anywhere in the implementation.** The validation chain is:
pilot → usage → TPO value → willingness to pay → paid renewal; the Wave 0 /
Wave 2 commercial gates (§9) remain the sole source of truth on price.
Fundraise context if gates pass: Indian seed multiples (~$3–5M pre, $1–1.5M
raise), leading with signed contracts + calibration pass rates — never "voice
AI," never Duolingo.

## 13. Explicitly out of scope until the loop is proven

Full mock interviews · AI avatars · social feeds · elaborate leaderboards /
gamification beyond streak-freeze · 20k+ question banks · marketplace /
recruiter products · real-time anything · microservices · additional backend
frameworks · custom/foundation models · complex agent architectures.

Moat hierarchy (investment order): ① spoken-performance/evidence data →
② evaluation/calibration system → ③ adaptive competency model →
④ institutional distribution → ⑤ structured question graph. The LLM is not
the moat.

## 14. Target data model (introduce per wave — never one migration)

```
Wave 0:  submissions(state machine cols, idempotencyKey),
         evaluation_versions, analytics_events,
         feature_flags(per-environment + per-college)
Wave 1:  audio_recordings, transcripts(+segments, provenance refs),
         delivery_metrics, evaluations(+dimensions, source tags),
         band_confirmations(labeling queue)
Wave 2:  outcome_reports(self-reported), tpo_views(audit)
Wave 3:  skills(8–12), user_skill_state, skill_evidence, recommendations
Wave 4:  organizations, cohorts, org_members, placement_outcomes, consents
Preserved unchanged: users, questions(+new tag columns), answers,
daily_assignments, streaks, notification_*, refresh_tokens
```

Repository layout evolves opportunistically: new domains (`audio/`,
`evaluation/`, `skills/`) become modules/packages as they land; existing routes
stay put until touched for other reasons.

## 15. Definition of "Kairos V2 is working"

> A student receives a relevant question, records a genuine 90-second answer,
> gets a trustworthy assessment of **what they said, how they structured it,
> and how they delivered it**, receives exactly one useful next action, and
> returns tomorrow because the system demonstrably adapts to their weaknesses.
>
> A TPO can see **who is practicing, what skills are improving, where the
> cohort is weak,** and eventually **whether that improvement translates into
> better interview/placement outcomes** — versus a comparable control.

North star feel: *"Kairos knows how I perform, knows where I'm weak, gives me
the right rep today, tells me exactly what went wrong, and gets progressively
better at training me."* — not *"an AI that asks me interview questions."*

Success metrics hierarchy mirrors §13's moat order: honest evaluation →
voice-performance data → competency model → adaptive selection → student
retention → institutional deployment → outcome measurement → distribution.

---

## 16. Addendum incorporation log (25 Aug 2026)

Disposition of the 17-point "Final Engineering Addendum" against this plan.
Nothing was rejected outright; items were adopted, sharpened, or confirmed as
already present. Scope and Wave 0–4 sequencing unchanged except where an item
explicitly required it.

| # | Addendum item | Disposition |
|---|---|---|
| 1 | Canonical Evaluation Contract | **Adopted** → §6.1: shared versioned zod schema in Wave 0, explicit types, model-vs-deterministic source tags, aggregator consumes validated outputs only, invalid output fails safely |
| 2 | Evidence provenance | **Adopted** → §6.1 provenance chain (`conclusion → evidenceRefs → evaluation → transcript/timestamps/rubric token`) |
| 3 | AudioStorage abstraction | **Adopted** → §8 Wave 1 item 2: `put/get/delete/exists` interface; PilotStorage now, ObjectStorage in Wave 4 — direct-to-API decision kept |
| 4 | System observability ≠ product analytics | **Adopted** → §10 split into the two required layers with full metric lists |
| 5 | Worker idempotency guarantees | **Already in plan (Wave 0); sharpened** with the explicit claim semantics and the no-duplicate list (billing/results/evidence/analytics/skill updates) |
| 6 | Authorization isolation tests | **Adopted** → §8 Wave 2 CI matrix incl. direct object-ID access; frontend never trusted |
| 7 | Feature flags | **Adopted, modified** → Wave 0: per-environment + per-college (`collegeId`). *Modification:* per-cohort targeting deferred to Wave 4 — the cohort entity doesn't exist before tenancy generalizes |
| 8 | Conservative English-only enforcement | **Adopted** → §4 rewritten: detection pipeline, soft-reject only on clear unsuitability, never penalize Indian-English norms, friction logging (`language_detected`, `code_switch_probability`, `rejection_reason`) reviewed at weekly gates |
| 9 | Placement Readiness Trend | **Adopted** → §8 Wave 2 fifth TPO aggregate: longitudinal, drillable, explicitly not a placement probability until outcome data justifies it |
| 10 | Pricing as hypothesis | **Adopted** → §12: no hard-coded ₹500–1,500 anywhere; commercial gates are the source of truth |
| 11 | Benchmark harness + adversarial cases in CI | **Adopted** → §8 Wave 1 exit criteria: permanent regression suite incl. prompt injection, confident-but-wrong, fluent-but-shallow, cross-dimension decoupling fixtures |
| 12 | Bands as backend canon (not just UI) | **Adopted** → §6.2: legacy 1–10 dual-read only, deprecated at type level, all V2 evaluations persist bands |
| 13 | Deterministic selector, no premature ML | **Already in plan (§7)**; added the selector's self-explanation requirement as wording |
| 14 | Retag 450 bank; rubric-complete gating | **Mostly in plan (§7); added** the pool-gating rule (rubric-incomplete questions excluded from adaptive pool) |
| 15 | Outcome capture from day one | **Already in plan (§8 Wave 2)** — collection begins at pilot start with pre-defined comparison rules; unchanged |
| 16 | Recording lifecycle tests | **Adopted** → §11: CI-tested retention/deletion/account-erasure flows, no orphaned voice artifacts |
| 17 | No premature institutional architecture | **Already in plan (§0 #6, Wave 4)**; added the clean-boundary note so later tenancy generalization is additive |

Implementation priority after incorporation (unchanged): stable V1 foundation →
voice recording → ASR → deterministic delivery → content/structure evaluation →
honest three-band aggregation → calibration benchmark → pilot validation →
competency/evidence model → adaptive selection → one-follow-up → TPO
visibility → outcome tracking → institutional generalization → distribution.
