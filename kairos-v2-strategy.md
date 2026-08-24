# Kairos v2 — Strategy & Product Thesis

**Author:** Umesh Chandra
**Date:** 13 Aug 2026
**Companion docs:** `market-research.md` (evidence base), `kairos-v2-pitch.md` (investor narrative)
**Mode:** Single thesis, no hedging. Voice-first, B2B2C.

---

## 1. Thesis Statement

> **Kairos is the daily 90-second spoken interview rep.**
> One company-tagged interview question a day, answered **out loud** under a real timer, graded **honestly** across content, structure, and delivery, and paid for by the **institution** that has the budget and the outcome — the college placement cell.

The skill Kairos trains is the one that actually fails in Indian interviews and that no free tool trains: **spontaneous spoken articulation**. ChatGPT evaluates text for free; nothing makes a final-year student *speak* a timed answer every day.

### 1.1 Why this exact shape (one-paragraph logic chain)

1. **Written answers are the wrong medium.** Typing is what students already do; the interview fails on speaking. (Evidence: Eklavvya, Rehearsal AI, HireQwik, Google's evolution toward Gemini Live voice.)
2. **The daily ritual format is unclaimed.** No scaled app owns "one question per day" (QOTD category is hobbyist). Wordle proved the daily ritual at 12M DAU; Duolingo proved streaks lift D7 +14%.
3. **The buyer is the college, not the student.** Placement cells demonstrably spend ₹5–15L/yr (Eklavvya), ₹599–1,298/student (AMCAT), and issue live tenders. Students churn at placement; the institution renews every batch. Consumer price-hostility becomes irrelevant.
4. **The moat is a combination, not a feature.** Current-season × company-tagged content (LLMs can't fabricate it) + calibration honesty (anti-sycophancy, defensible where free chatbots are flattering) + institutional distribution + an Indian-accent delivery data asset.
5. **The two structural risks are testable in 90 days for under $5k.** (a) Do students speak daily? (b) Does Indian-accent ASR work on budget Androids? Pre-committed kill gates decide with data.

---

## 2. The Core Loop (90 seconds/day)

```
20:00 — WhatsApp pushes today's question (company-tagged, personalized variant)
   |        [shown only inside the timed session]
   v
You record a 90-second voice-note answer   ← the voice-note metaphor: no camera, no avatar
   |
   v
AI grades 3 channels (split by modality so it can't hallucinate):
   • Content    — LLM vs evidence-token rubric (stated claim → example → wrap)
   • Structure  — LLM vs structure rubric (opening, logic, closure)
   • Delivery   — DETERMINISTIC DSP + ASR timestamps: fillers, pace, silence, clarity
   |
   v
3-band honest grade: Needs Work / Solid / Strong   ← not a noisy 1–10
   + one specific "do this next" instruction
   |
   v
Streak + college beat-rate ("67% of your college attempted today")
   |
   v
Deep-link to lightweight web/app: skill map (6–8 dims), library, history
```

**Design rules:**
- Never raise the 90-second cap. Shorter than a WhatsApp voice note.
- The grade is three bands plus **one** action item — direction over precision.
- A grade is never served from an uncalibrated pipeline (see §4).
- The skill map is **navigation**, not a trophy wall: it picks tomorrow's question, updates visibly after every take.

---

## 3. The Product (v2 spec)

### 3.1 Daily question engine
- **Shared ritual layer:** daily theme ("DBMS day," "puzzle day," "project-grilling day") + shared countdown + college beat-rate. Preserves the Wordle-style daily moment without a shared question string.
- **Personalized layer:** within the theme, each user gets a variant sequenced by target companies (set at onboarding) + weak-skill map + difficulty band. No two users see the same question the same day → leakage becomes near-worthless (the graded take is the non-leachable asset anyway).
- **Company tagging:** TCS, Infosys, Wipro, Accenture, Cognizant, Capgemini, HCL, Tech Mahindra, IBM, Amazon India, Deloitte, Zoho, Flipkart + long tail. Tag schema: `company × role × round (OA aptitude / OA coding / technical / HR-managerial) × topic × difficulty × season-date × source`.
- **Anti-leak mechanics:** question rendered only inside the timed session; per-account watermarking of variants; leaks treated as free distribution with answer-reveal culture.

### 3.2 The honest grader (the trust moat)
The current codebase grades with a **single-shot LLM call at temperature 0.2, one model, one retry-on-parse-failure, one rounded 1–10 integer**. Published research says that design *guarantees* the documented noise (13.6% verdict flips, ±1.2pt error). v2 replaces it:

1. **Kill the single number.** Three bands computed from aggregated dimension evidence. Bands are stable where points are not.
2. **Multi-judge, cheap:** 3 parallel judges (temperatures 0.0/0.4/0.7, or one small + one frontier model); majority agreement on bands. Landed cost stays ~$0.01–0.02/answer.
3. **Modality-split measurement (the anti-hallucination move):** the LLM never measures delivery. Fillers/pace/silence come from deterministic DSP + ASR timestamps. A judge that literally cannot hallucinate "you paused 12 times" is the differentiator.
4. **Calibration set:** gold-labeled anchor set (50 answers/dimension, human-rated). Judges must pass weekly; drift triggers prompt repair. Publish the pass rate — transparency is the brand.
5. **Blind re-score:** 10% of answers re-scored next day; if >15% of the sample flips bands, the pipeline freezes for retune.
6. **Skill-map aggregation absorbs noise:** single-answer error shrinks over 30+ takes; map shows uncertainty ("delivery: 7.2 ± 0.6"). Showing uncertainty is the honest-grader proof.
7. **Freemium as architectural honesty:** text tier gets content-only feedback; voice tier unlocks delivery metrics — differentiates paid, protects ASR cost, shrinks the consistency surface.

### 3.3 Voice intake
- Record inside a lightweight web/PWA recorder or the app (deep-linked from WhatsApp). **Recording never transits WhatsApp** → WER control + DPDP story intact.
- Pre-take environment check: noise rejection before grading ("too noisy — retry," never a bad score).
- 16kHz upload + device-side noise suppression; device-tier completion tracking.
- One-earbud whisper mode, phone-held-down recording, "no one hears this but the AI" copy, auto-delete previews.

### 3.4 Habit & community
- Streak + streak freeze + missed-day replay (churn is not binary).
- College beat-rate, anonymous peer clips (with consent), leaderboard — a contest, not an exam.
- 8pm scheduled slot (hostel dinner time); WhatsApp service-window pushes.

---

## 4. Distribution Architecture (WhatsApp hybrid)

### 4.1 Why WhatsApp
- The user already lives there: 535M+ Indian users, voice notes native, installs nothing, notification-hell avoided.
- **BSP cost model** (India rates, ~2026): utility template ₹0.115/delivered; marketing ₹0.86/delivered; service messages free inside the open 24h window; free 72h entry window. A daily question push framed as utility: ~₹108k/yr for 6,250 students across 150 days — noise against ₹62L+ revenue; and if the user taps a button, the service window makes most traffic free.
- The leak groups are themselves the distribution channel.

### 4.2 Why not WhatsApp-only
- UX ceilings (skill map, history, rich feedback) need a web/app surface.
- **DPDP spine:** routing student voice through Meta complicates the cross-border/consent story a TPO must sign. "Your students' voices live in Meta's cloud" kills the B2B close.
- Audio intake at WhatsApp's ~2-minute voice-note cap leaves no headroom for a 90s take.

### 4.3 The hybrid
- **WhatsApp = funnel + ritual layer:** acquisition, daily question push, streak nudge, result delivery, community leaderboard.
- **Web/app = grading surface + map:** deep-link from the bot with the question preloaded; tap to record.
- **Telegram = community + live-leak-monitoring only.**
- CAC ≈ ₹0; retention mechanics native; clean data story.

---

## 5. Monetization (B2B2C)

### 5.1 Institution tier (the spine)
- **Price:** ₹500–1,500/student/placement-season (final-year cohort as billable unit). Positioned **below AMCAT's ₹599–1,298**, at an expense-line level a TPO can sign without a procurement committee.
- **Contract = retention.** Invoice per-batch, up-front, at season start (Aug). Multi-year or first-refusal renewal. A new final-year cohort arrives every year.
- **TPO product:** per-student practice completion, readiness heatmaps, one-click class deploy, placement-outcome ROI report — the renewal artifact.
- **Student-control trust feature:** student toggle for what the TPO can see (keeps "institution sees student data" inside DPDP purpose-limitation).

### 5.2 Consumer tier (growth + income)
- **Free:** text answers + 1 voice take/day + stale/long-tail content browse.
- **Paid:** ₹199–399/season or ₹49–99/month (UPI). Unlocks current-season content, unlimited voice, adaptive daily plan, readiness score, mock-interview mode (later).
- Free→paid conversion target ≥2%; B2B contracts are the primary revenue proof, consumer conversion secondary evidence.

### 5.3 Unit economics (per season, mid band)
- Revenue ₹1,000/student; ~150 takes/season at ~$0.02 landed ≈ ₹250–625 variable cost → healthy gross margin. Bounty budget capped at ≤30% of revenue. Startup path: 20 colleges @ ~₹5L ≈ ₹1Cr ARR.

---

## 6. Content Strategy (12 months, weekly targets)

**Strategy: hybrid — aggregation seed + give-to-get backbone + cash bounty accelerant + calibration flywheel.** Not build-from-zero (1/9/90 kills it), not buy (nothing for sale matches the gap).

| Phase | Months | Actions | Targets |
|---|---|---|---|
| Seed | 0–1 | Structure public sources (GFG Company Interview Corner prose, r/developersIndia, Telegram dumps, AmbitionBox public pages) into the tag schema via NLP. "Data engineering problem, not content problem." | 5,000 items in 30 days (~1,200/wk) |
| Loop | 1–3 | Anonymous submission form; **give-to-get gating** (submit 1 verified experience → unlock answer keys; ~24% contribute at the wall per NBER/Glassdoor); 2-source verification; 30–50 campus ambassadors (₹500–2,000/mo stipends, certificates, leaderboards) | 50 verified/wk |
| Season 1 | 3–6 | Peak drives Aug–Dec: Telegram monitoring (same-day dumps) + bounties ₹50–150/verified current-season question; premium for first report of a new drive | 200–400/wk in-season |
| Calibrate | 6–9 | Every answer feeds IRT difficulty estimates; launch placement-readiness score v1 calibrated to self-reported outcomes (NQT cleared? track? offer?) | 50–100+ responses on flagship items |
| Monetize | 9–12 | Paid tier live; bounty budget ≤30% of revenue; the annual community loop becomes the moat | 15k–20k items, self-funding |

**Year-1 end-state:** 15,000–20,000 structured, tagged, season-dated items — the only India campus bank that is simultaneously current-season, interview-stage, tagged, and calibrated. Each property is copyable alone; the combination plus the seasonal community loop is not.

---

## 7. The 90-Day MVP and Kill Criteria

### 7.1 Scope (cut to the bone)
- WhatsApp bot (daily question push + streak) + simple web recorder.
- One question/day; 3-band grade (content + structure from LLM; delivery from DSP/ASR timestamps).
- One leaderboard, one countdown, one readiness heatmap.
- 300 hand-seeded questions, company-tagged, from public placement-experience write-ups.
- 2 pilot colleges (warm access), ₹500/student, ~100 students each.
- Calibration set + blind re-score (v1.1) — bands + calibration buy the honesty claim cheaply.

**Explicitly excluded from MVP:** mock-interview mode, community contributions, multi-judge, full skill map (v1 = 6-dim bar chart), Android app, gamification beyond streak, full DPDP machinery beyond consent notice + deletion API + retention policy (legal review in week 1). De-scope rule: anything not the daily 90-second loop or the TPO renewal report is cut.

### 7.2 Pre-committed kill gates (numbers, decided before launch)
1. **D30 voice-take retention ≥ 30%** (≥9 of first 30 days recorded) — if students won't speak daily, the wedge doesn't exist.
2. Median **≥3 takes/active-user/week** in the pilot.
3. **≥50%** of pilot students complete **≥20 takes** in the season.
4. Blind re-score **band-flip ≤15%** and calibration-set **pass ≥90%** — the honesty brand must be real.
5. **≥2 colleges renew or ≥2 new colleges pay** within months 4–6 (sales-velocity proof).
6. Free→paid conversion **≥2%** OR any college contract.

If gates 1–3 miss, spend was <$5k and the thesis ("placement prep is not a spoken daily habit") is retired with data. If they hit, the B2B engine, map, and content scale build against a proven behavior.

---

## 8. Roadmap

| Phase | Window | Deliverables |
|---|---|---|
| Kill test | M0–M3 | WhatsApp bot + recorder + 3-band grader + 300-question seed + 2 pilots + gates 1–4 |
| B2B scale | M3–M6 | TPO sales motion, per-batch contracts, readiness dashboards, gates 5–6, 20-college funnel |
| Content flywheel | M3–M9 | GTG + ambassadors + bounties + Telegram mining; season-1 content; calibration |
| Consumer layer | M6–M12 | Freemium tiers, UPI checkout, skill map v2, readiness score v1, mock-interview mode (later) |
| Fundraise | ~M9+ | Seed: kill-test data + 2 pilot renewals + calibration pass rate + content throughput |

---

## 9. Funding Narrative (what a seed deck must show)

1. **Problem:** 15L engineering grads/yr, ~40% placed, the interview fails on speaking, and free ChatGPT only grades text (and flatters).
2. **Wedge:** the unowned daily spoken rep — 90 seconds, streak, honest grade.
3. **Buyer:** colleges already spend ₹5–15L/yr on placement tech; we're the ₹500–1,500/student daily-practice layer under the AMCAT price line.
4. **Moat:** current-season tagged content (community loop) × calibration honesty (anti-sycophancy) × institutional distribution × Indian-accent delivery data — combination, not feature.
5. **Traction:** kill-gate results, 2 paying colleges, band-flip + calibration pass rates, content throughput per week.
6. **Ask:** seed at ~$1–2M pre-money for India (positioned AI+distribution, not consumer; consumer apps discount to ~$10.6M pre-money, AI seed ~$17.9M). 24-month runway.

**Anti-patterns to avoid in the deck:** "we use AI" claims; over-claiming the score's precision; the live-copilot/cheat-assist category (OphyAI/Alex cautionary tales); relying on consumer conversion as the primary revenue story.

---

## 10. Risk Register (v2 object-level)

| Risk | Verdict | Response |
|---|---|---|
| Voice behavior doesn't materialize | Kill-test | Gate 1–3, decided pre-launch |
| ASR fails on budget Androids | Kill-test | 100-utterance vendor benchmark on real device tier before any commit |
| LLM grade noise | Fixable by design | Bands, multi-judge, calibration set, blind re-score, modality-split, skill-map aggregation, published pass rates |
| Question leakage | Fixable by design | Personalized variants + fungible questions; graded take is the currency |
| B2B sales velocity | Fixable (execution) | Bottom-up TPO entry, ₹500 pilot, referral packaging, OEM fallback |
| Free-content incumbents copy the loop | Managed | Speed + institutional contracts + honesty brand; NxtWave can copy a feature in a quarter, not a deployment |
| Placement-season churn | Managed | Per-batch season contracts; pre-final-year pipeline; alumni→contributors |
| DPDP | Managed | Adults target; India-hosted ASR; auto-delete raw audio; season+90d retention; deletion API; student-controlled TPO visibility |
| Procurement seasonality | Managed | Up-front annual invoicing; multi-year terms |
| Scope creep | Managed | De-scope rule; MVP definition; kill gates |

---

## 11. What Is Not Kairos v2

- Not a "score your pasted answer" tool (ChatGPT does that free, and flatters).
- Not a live-interview copilot / stealth assist (ethical line + employer bans).
- Not a mock-interview catalog (NxtMock owns the library; we own the daily rep).
- Not an aptitude/OA content business (PrepInsta owns that flank; we reference, don't compete).
- Not a subscription to a student who won't pay (the college pays; the student gets free daily practice).

---

## 12. Decisions Locked

1. Single thesis: voice-first, B2B2C. No hedged alternates.
2. Strategy-only for now; no code changes in this iteration.
3. Deliverables: this doc, `market-research.md`, `kairos-v2-pitch.md`.
4. Next code iteration (when approved) begins with the grading-architecture fix and the WhatsApp-bot + recorder MVP, per §7.
