# Kairos V2 — Engineering & Product Build Plan

## Executive objective

Transform the current Kairos `develop` codebase from a strong written-answer V1 into the intended **voice-first, adaptive, B2B2C interview-readiness platform**.

The end state should be:

> **Kairos gives a student one high-quality 90-second spoken interview rep each day, evaluates content, structure, and delivery separately, identifies the student's actual weaknesses, chooses what they should practice next, and gives colleges measurable evidence that interview readiness is improving.**

Do not treat this as a feature-expansion project. Treat it as a **product architecture transition**.

The existing V1 functionality should remain stable while V2 is introduced incrementally.

---

# 1. Non-negotiable product principles

These principles should guide every implementation decision.

### 1.1 Kairos is not an AI interviewer

The core product is:

**Adaptive interview training.**

AI is the evaluator and reasoning layer. It is not the product itself.

### 1.2 The student's spoken performance is the primary data asset

Store structured evidence from every attempt:

- audio metadata
- transcript
- timing
- speech characteristics
- content evaluation
- structure evaluation
- delivery metrics
- strengths
- weaknesses
- concepts demonstrated
- concepts missed
- next recommended action
- historical skill state

### 1.3 Never use one LLM score as the source of truth

Evaluation must be modular:

**Content → LLM**

**Structure → LLM + deterministic signals**

**Delivery → ASR + DSP + deterministic calculations**

Then aggregate these into the final three-band result.

### 1.4 Personalization is the core loop

Kairos should eventually select:

> **the best next question for this student**

not:

> a random question from this category.

### 1.5 The college is the buyer; the student is the daily user

The architecture must support:

**Institution → cohort → student → practice → performance → readiness → placement outcome**

### 1.6 Evidence beats claims

Do not tell a student they are "good at communication."

Show why:

- average answer length
- filler frequency
- pause distribution
- structure adherence
- response quality
- historical trend

Do not tell a college that Kairos "improves employability."

Eventually show:

**usage → skill improvement → interview outcomes → placement outcomes**

---

# 2. Phase 0 — Stabilize the current codebase

Before building V2, remove technical ambiguity from the current repository.

## 2.1 Repository cleanup

Audit and remove or consolidate:

- dead packages
- unused providers
- duplicate utilities
- obsolete V1 AI abstractions
- inconsistent naming such as `claude.ts` for a generic evaluator
- duplicate API abstractions
- unused tRPC infrastructure if REST remains the chosen API
- duplicated environment/config handling

Preferred backend architecture:

**Express + Drizzle + Zod + Redis/BullMQ**

Do not introduce another backend framework unless there is a compelling reason.

## 2.2 Make AI provider abstraction explicit

Create:

```text
AIProvider
  ├── OpenRouterProvider
  ├── OpenAIProvider
  └── MockProvider
```

and an evaluator abstraction:

```text
Evaluator
  ├── ContentEvaluator
  ├── StructureEvaluator
  └── DeliveryEvaluator
```

The rest of the application must never know which model is being used.

## 2.3 Add evaluation versioning

Every evaluation must record:

```text
model
provider
modelVersion
promptVersion
rubricVersion
evaluatorVersion
createdAt
```

This is mandatory.

If the model changes, Kairos must still be able to explain historical scores.

---

# 3. Phase 1 — Fix current production issues

These should happen before voice work.

## 3.1 Make answer submission fully idempotent

Current intended flow should become:

```text
POST answer
    ↓
validate auth/input
    ↓
reserve answer row atomically
    ↓
if already exists → return existing evaluation state
    ↓
enqueue evaluation job
    ↓
return submission ID
```

Never invoke an LLM before the database has established that this submission is unique.

Add:

```text
submissionId
idempotencyKey
```

where appropriate.

## 3.2 Build a real answer state machine

Use:

```text
created
queued
processing
completed
failed
cancelled
```

Do not use an ambiguous collection of null fields to infer state.

Every transition should be explicit.

## 3.3 Make workers idempotent

If a BullMQ job executes twice:

```text
if evaluation already completed:
    return
```

Use atomic state transitions so duplicate workers cannot duplicate billing or corrupt data.

## 3.4 Rate limiting

Use two layers:

```text
Per-user limit
+
Per-IP abuse limit
```

Do not rely solely on IP-based answer limiting.

## 3.5 Error handling

Every failed AI/audio operation must produce:

- internal diagnostic information
- user-safe error message
- retryability flag
- retry count

Do not expose provider errors directly to users.

---

# 4. Phase 2 — Rebuild the question/content model

The current question table is too shallow for V2.

Introduce a proper content graph.

## 4.1 Question metadata

Each question should eventually support:

```text
id
title
prompt
category
difficulty
role
company
roundType
topic
subtopic
conceptTags[]
questionType
sourceType
season
isActive
isPracticeOnly
```

Examples:

```text
role = SDE
roundType = technical
topic = DBMS
subtopic = indexing
difficulty = medium
```

## 4.2 Rubric model

Do not keep the rubric primarily as free text.

Represent grading criteria structurally:

```text
rubric
  evidenceTokens[]
  mustMention[]
  goodSignals[]
  weakSignals[]
  misconceptionSignals[]
  structureExpectations[]
```

This makes grading more consistent.

## 4.3 Question variants

One underlying concept should be able to produce multiple question variants.

Example:

```text
Concept:
Database indexing

Variant A:
Explain indexing to an interviewer.

Variant B:
Why can an index make a query slower?

Variant C:
Your index exists but the query is still slow. Why?
```

The purpose is to stop students from memorizing answers.

---

# 5. Phase 3 — Build the competency engine

This is the most important backend/product subsystem.

Create a persistent skill model.

## 5.1 Skill taxonomy

Start with a manageable taxonomy.

Example:

```text
Technical
├── DSA
├── DBMS
├── OS
├── Computer Networks
├── OOP
├── System Design
├── Backend
├── Cloud
└── Programming Languages

Interview Communication
├── Clarity
├── Conciseness
├── Structure
├── Technical Explanation
├── Follow-up Handling
└── Confidence

Behavioral
├── Ownership
├── Leadership
├── Conflict
├── Failure
└── Problem Solving
```

Do not launch with hundreds of skills.

Start with approximately 30–50 meaningful competencies.

## 5.2 User skill state

Create:

```text
user_skill_state
```

with:

```text
userId
skillId
score
confidence
evidenceCount
lastAssessedAt
trend
masteryLevel
```

The important distinction:

**score ≠ confidence**

Three evaluations are not as trustworthy as thirty.

## 5.3 Evidence table

Create:

```text
skill_evidence
```

Every evaluation can add evidence.

Example:

```text
student
→ DBMS
→ indexing
→ demonstrated weak understanding
→ source = spoken answer
→ evaluation ID
→ confidence = 0.82
```

This allows the competency engine to explain its conclusions.

---

# 6. Phase 4 — Build the voice vertical slice

This is the first major V2 milestone.

Do not build the entire platform first.

Make one complete voice loop work.

## 6.1 Recording

The client should support:

- microphone permission
- audio level check
- 90-second hard limit
- pause/resume
- recording timer
- upload progress
- retry
- cancellation

Target:

**16 kHz mono speech audio** unless testing proves another format is better.

## 6.2 Upload architecture

Do not stream large audio through the main API server.

Preferred:

```text
client
 ↓
request signed upload URL
 ↓
object storage
 ↓
finalize upload
 ↓
queue evaluation
```

Store:

```text
storageKey
mimeType
durationMs
sizeBytes
sampleRate
checksum
```

## 6.3 Recording privacy

The product specification explicitly treats voice data as sensitive.

Implement:

- consent record
- retention policy
- delete recording
- delete account
- configurable retention duration
- automatic deletion of raw audio after retention window

Do not permanently store raw voice simply because storage is cheap.

---

# 7. Phase 5 — Speech-to-text pipeline

Create an independent ASR service.

```text
audio
 ↓
ASR
 ↓
transcript
 ↓
word timestamps
 ↓
confidence
```

Store:

```text
transcript
segments[]
words[]
timestamps
language
model
confidence
```

The transcript is a derived artifact and should remain linked to the original recording.

---

# 8. Phase 6 — Deterministic delivery analysis

This should deliberately **not** depend solely on an LLM.

Calculate deterministic metrics such as:

### Timing

- total duration
- speaking duration
- silence duration
- start delay
- ending truncation

### Speech

- words per minute
- speech-to-silence ratio
- filler count
- filler rate
- repetition rate

### Pauses

- average pause duration
- longest pause
- number of long pauses
- pause distribution

### Potential confidence signals

Use carefully.

Do **not** claim to detect psychological confidence from audio with certainty.

Instead phrase signals such as:

> "frequent long pauses"

rather than:

> "low confidence."

This distinction matters scientifically and ethically.

---

# 9. Phase 7 — Build the three-part evaluator

This is Kairos' core intelligence engine.

## 9.1 Content evaluator

Input:

```text
question
rubric
transcript
candidate metadata
```

Output:

```json
{
  "band": "solid",
  "evidenceFound": [],
  "missingEvidence": [],
  "misconceptions": [],
  "strengths": [],
  "weaknesses": []
}
```

Do not allow the model to invent evaluation criteria.

The rubric should already contain the evaluation framework.

## 9.2 Structure evaluator

Evaluate:

- opening
- organization
- logical progression
- conclusion
- directness
- unnecessary repetition

Use both transcript features and LLM reasoning.

## 9.3 Delivery evaluator

Use deterministic metrics plus limited model interpretation.

Example:

```text
pace
pause control
filler rate
speech continuity
answer duration
```

Avoid fake precision.

Do not output:

> "Confidence = 82.3"

unless there is a defensible measurement model.

---

# 10. Phase 8 — Three-band grading

Do not expose the old `1–10` score as the primary grade.

Use:

```text
NEEDS WORK
SOLID
STRONG
```

Then provide dimensions:

```text
Content      Solid
Structure    Needs Work
Delivery     Strong
```

The student should immediately understand:

> **What happened?**

and:

> **What do I do next?**

## 10.1 One next action

Every completed rep should produce exactly **one primary recommendation**.

Example:

> **Next action:** Answer the same question again, but lead with your conclusion before explaining the implementation.

This is crucial.

Don't give students ten paragraphs of feedback.

---

# 11. Phase 9 — Adaptive question selection

Only after the competency model exists should question selection become intelligent.

Build:

```text
QuestionSelector
```

Inputs:

```text
student skills
recent performance
weaknesses
target role
target companies
difficulty
recent questions
streak
```

Output:

```text
best next question
```

## Initial algorithm

Do not start with ML.

Use a deterministic scoring function:

```text
score =
  weaknessWeight
+ targetRoleWeight
+ targetCompanyWeight
+ difficultyFit
+ recencyPenalty
+ repetitionPenalty
+ skillCoverage
```

This gives you explainability and easy tuning.

Later, you can replace portions with ML.

---

# 12. Phase 10 — Build the daily 90-second product experience

The desired daily flow:

```text
Question
↓
Prepare
↓
Record 90 sec
↓
Submit
↓
Processing
↓
Result
↓
One next action
↓
Skill update
```

The result page should **not** feel like an academic grading report.

It should feel like:

> "I just became slightly better at interviews."

Show:

```text
TODAY'S REP
Content      SOLID
Structure    NEEDS WORK
Delivery     STRONG

You improved:
+ clearer technical explanation

Your next action:
Lead with the answer before the explanation.

Skill:
Technical communication ↑
```

---

# 13. Phase 11 — Build the TPO/B2B layer

Do this only after the student voice loop works.

Introduce multi-tenancy.

## Core entities

```text
organizations
organization_members
cohorts
cohort_members
```

Roles:

```text
super_admin
college_admin
tpo
faculty
student
```

## College dashboard

Initial dashboard should answer only five questions:

### 1. Participation

```text
Assigned
Started
Completed
7-day active
```

### 2. Readiness

Heatmap by:

```text
cohort
branch
skill
```

### 3. Weaknesses

Top systemic weaknesses:

```text
technical explanation
DBMS
system design
communication
```

### 4. Student drill-down

TPO can inspect:

- completion
- trend
- skill state
- evaluation history
- interventions

### 5. Outcome

Eventually:

```text
practice
→ assessment
→ interview
→ placement
```

---

# 14. Phase 12 — Build placement-outcome linkage

This is where Kairos starts becoming genuinely difficult to copy.

Add institutional outcome data:

```text
student
company
role
round
result
offer
CTC
placementDate
```

Then connect:

```text
Kairos usage
+
skill progression
+
interview outcomes
+
placement outcomes
```

Eventually the system should be able to answer:

> "Students who completed at least 20 Kairos reps had X% higher interview conversion than comparable students."

Do not claim causality prematurely.

Start with correlation and carefully defined cohorts.

---

# 15. Phase 13 — WhatsApp integration

WhatsApp should **not be the core application**.

Use it as:

- reminder
- daily prompt
- deep link
- result notification
- reactivation channel

Example:

```text
🔥 Today's Kairos rep is ready.

90 seconds.
One interview question.
One measurable improvement.

[Start today's rep]
```

Then the actual recording happens inside the appropriate web/app experience.

This keeps Kairos' audio experience under your control and minimizes WhatsApp complexity/cost.

---

# 16. Phase 14 — Notification system

Use the existing outbox architecture.

Add event types:

```text
daily_challenge
streak_risk
evaluation_ready
skill_improved
weekly_summary
college_campaign
```

Respect:

- timezone
- quiet hours
- user preferences
- institution policy

Do not become a notification spam product.

---

# 17. Phase 15 — Privacy and security

This must be designed before broad voice deployment.

Minimum requirements:

### Audio

- explicit consent
- encrypted storage
- signed access URLs
- configurable retention
- deletion workflow

### Student data

- tenant isolation
- strict authorization checks
- audit log
- export
- deletion

### College access

A TPO should never be able to access:

- unrelated institutions
- arbitrary students
- private data outside their cohort

### AI

Treat student speech/transcripts as potentially sensitive.

Store only what is actually required.

---

# 18. Phase 16 — Evaluation quality and calibration

This deserves its own workstream.

Create a private evaluation benchmark.

For perhaps the first:

**500–1,000 human-labeled answers**

have trained reviewers score:

- content
- structure
- delivery
- overall band

Then compare Kairos' automated evaluation against the human reference.

Track:

```text
agreement
precision
recall
confusion matrix
false-positive rate
false-negative rate
```

More important than average score:

### Calibration consistency

Two answers of similar quality should receive similar grades.

This is where "honest grader" becomes a real technical capability instead of marketing.

---

# 19. Build an evaluator benchmark harness

Create:

```text
/evaluation-benchmark
```

with fixed examples:

```text
excellent answer
good answer
weak answer
rambling answer
factually wrong answer
memorized answer
off-topic answer
very short answer
very long answer
```

Run every evaluator change against the benchmark.

A change to the prompt/model must not silently break grading behavior.

This should be part of CI.

---

# 20. Cost architecture

Before scaling, instrument:

```text
ASR cost / minute
LLM content cost / evaluation
LLM structure cost / evaluation
storage cost
WhatsApp cost
average evaluation latency
retry cost
```

Then calculate:

```text
cost per student per month
cost per active student
cost per completed rep
cost per college
```

You cannot price a B2B2C product intelligently without this.

---

# 21. MVP rollout order

Do NOT build everything sequentially according to feature count.

Build in vertical slices.

## Milestone A — Voice Rep

Deliver:

```text
Question
→ recording
→ upload
→ ASR
→ evaluation
→ result
```

Success criterion:

**A student can complete one high-quality 90-second rep end-to-end.**

---

## Milestone B — Honest Grading

Deliver:

```text
content
structure
delivery
3-band result
one next action
```

Success criterion:

**Human evaluators generally agree with Kairos' grading.**

---

## Milestone C — Skill Intelligence

Deliver:

```text
evaluation
→ evidence
→ skill state
→ next question
```

Success criterion:

**Kairos stops behaving like a random question generator.**

---

## Milestone D — Institutional Layer

Deliver:

```text
college
→ cohort
→ campaign
→ student
→ analytics
```

Success criterion:

**A TPO can deploy Kairos to a real cohort and monitor usage/readiness.**

---

## Milestone E — Placement Outcomes

Deliver:

```text
practice
→ readiness
→ interview
→ outcome
```

Success criterion:

**You can produce a credible institutional outcomes report.**

---

# 22. What NOT to build yet

Explicitly tell the coding agent not to expand scope into these until the core loop is validated:

- full-scale mock interviews
- AI avatar interviewer
- complicated social feeds
- elaborate leaderboards
- huge gamification systems
- 20,000+ question bank
- marketplace
- advanced recruiter marketplace
- real-time multiplayer
- unnecessary microservices
- multiple competing backend frameworks
- custom model training
- proprietary foundation model

These are distractions until the core behavior is proven.

---

# 23. Suggested target architecture

```text
                     ┌──────────────────────┐
                     │      WEB CLIENT      │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │    MOBILE CLIENT     │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │      API SERVER      │
                     │ Express + Zod        │
                     └──────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
      ┌───────────┐       ┌───────────┐       ┌────────────┐
      │  MySQL    │       │   Redis   │       │  Storage   │
      │  Drizzle  │       │ BullMQ    │       │ Audio      │
      └───────────┘       └─────┬─────┘       └────────────┘
                                │
                                ▼
                      ┌────────────────────┐
                      │ Evaluation Workers │
                      └─────────┬──────────┘
                                │
             ┌──────────────────┼─────────────────┐
             │                  │                 │
             ▼                  ▼                 ▼
          ┌───────┐         ┌────────┐        ┌────────┐
          │  ASR  │         │ Content│        │Delivery│
          │       │         │  Eval  │        │ / DSP  │
          └───────┘         └────────┘        └────────┘
             │                  │                 │
             └──────────────────┼─────────────────┘
                                ▼
                    ┌────────────────────────┐
                    │ Evaluation Aggregator  │
                    └────────────┬───────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ Competency Engine      │
                    └────────────┬───────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ Adaptive Question      │
                    │ Selection Engine       │
                    └────────────────────────┘
```

---

# 24. Recommended repository structure

Evolve the existing monorepo toward:

```text
apps/
  api/
    modules/
      auth/
      users/
      questions/
      submissions/
      audio/
      evaluation/
      skills/
      daily/
      organizations/
      cohorts/
      analytics/
      notifications/

  web/
  mobile/

packages/
  db/
  shared/
  config/
  evaluation/
    schemas/
    rubrics/
    benchmarks/
  audio/
  analytics/
```

Keep domain logic out of giant route files.

Routes should mostly be:

```text
authenticate
validate
call service
return response
```

---

# 25. Data model target

Eventually the core domain should resemble:

```text
users
organizations
organization_members
cohorts
cohort_members

skills
user_skill_state
skill_evidence

questions
question_variants
question_tags
rubrics

daily_assignments
submissions

audio_recordings
transcripts
transcript_segments
delivery_metrics

evaluations
evaluation_dimensions
evaluation_versions

recommendations

placement_outcomes

notifications
notification_outbox

refresh_tokens
consents
audit_logs
```

Do not create all of these in one migration.

Introduce them as the relevant milestone is built.

---

# 26. Success metrics

The coding agent should not optimize for feature count.

The product should be judged by:

### Student

**D1 completion**

**D7 retention**

**D30 retention**

**reps/student/week**

**percentage completing full 90-second answer**

### Evaluation

**human/AI agreement**

**evaluation latency**

**evaluation failure rate**

### Skill

**skill improvement over time**

**weakness resolution rate**

**recommendation acceptance/completion**

### Institution

**student activation**

**cohort completion**

**readiness improvement**

**interview conversion**

**placement conversion**

Eventually:

**renewal rate**

---

# 27. Kill gates

Do not keep building indefinitely without validating the core behavior.

### Kill/redirect if:

**D7 voice retention is extremely low**

Students do not want daily voice practice.

**Students consistently skip recording**

The 90-second interaction is too burdensome.

**Human graders disagree heavily with Kairos**

The "honest grader" proposition is not working.

**TPOs like the demo but refuse to deploy**

The institutional workflow is wrong.

**Students practice but placement outcomes don't move**

The training content isn't translating into actual value.

These are more important than whether the UI looks excellent.

---

# 28. What the coding agent should implement first

Give the coding agent this order:

### Sprint 1

**Stabilization**

- clean architecture
- remove dead code
- normalize AI provider abstraction
- idempotent answer creation
- worker idempotency
- explicit evaluation state machine
- rate limiting
- evaluator versioning
- tests for race conditions
- tests for timezone behavior

### Sprint 2

**Voice infrastructure**

- audio recording
- signed uploads
- object storage
- audio metadata
- consent
- retention/deletion
- submission lifecycle

### Sprint 3

**ASR + Delivery**

- speech-to-text
- timestamps
- deterministic speech metrics
- delivery evaluation
- evaluation persistence

### Sprint 4

**V2 evaluator**

- structured rubric
- content evaluation
- structure evaluation
- delivery evaluation
- three-band result
- one next action
- benchmark harness

### Sprint 5

**Competency engine**

- skills
- skill evidence
- user skill state
- trend calculation
- confidence
- adaptive recommendation

### Sprint 6

**Adaptive questions**

- question metadata
- variants
- selection algorithm
- personalization
- anti-repetition

### Sprint 7

**B2B**

- organizations
- cohorts
- TPO roles
- student enrollment
- campaigns
- dashboard
- heatmaps

### Sprint 8

**Outcome tracking**

- interview outcomes
- placement outcomes
- cohort analytics
- institutional report

### Sprint 9

**Distribution**

- WhatsApp integration
- push notifications
- reminders
- reactivation

### Sprint 10

**Production hardening**

- load testing
- queue reliability
- storage lifecycle
- monitoring
- cost controls
- security review
- privacy review
- backup/recovery

---

# 29. The one thing I would tell the coding agent above everything else

> **Do not merely bolt voice recording onto the existing V1.**

That would create:

```text
V1 written-answer app
+
microphone button
```

That is not Kairos V2.

Instead, redesign the domain around:

```text
Spoken performance
      ↓
Evidence
      ↓
Evaluation
      ↓
Skill state
      ↓
Adaptive next rep
      ↓
Longitudinal improvement
      ↓
Institutional outcome
```

That is the actual Kairos product.

---

# 30. Final engineering/product priority

The correct order of importance is:

**1. Honest evaluation**

**2. Voice-performance data**

**3. Competency model**

**4. Adaptive question selection**

**5. Student retention loop**

**6. Institutional deployment**

**7. Placement-outcome measurement**

**8. WhatsApp/distribution**

**9. Secondary features**

That order protects Kairos from becoming another AI wrapper while keeping the implementation grounded in measurable product value.

## Definition of "Kairos V2 is working"

Kairos V2 is not "done" when all pages exist.

It is working when:

> A student receives a relevant question, records a genuine 90-second answer, gets a trustworthy assessment of **what they said, how they structured it, and how they delivered it**, receives exactly one useful next action, and returns tomorrow because the system demonstrably adapts to their weaknesses.

And a TPO can see:

> **who is practicing, what skills are improving, where the cohort is weak, and whether that improvement translates into better interview/placement outcomes.**

That should be the engineering team's north star.