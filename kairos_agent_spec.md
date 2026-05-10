# Kairos — Complete Agent Build Spec

---

## Agent Instructions

Read this entire document before writing a single line of code. Do not skip sections. Do not make assumptions — every decision is specified here. If something is not specified, use the simplest correct implementation and add a `// TODO:` comment.

Work in this order:
1. Project setup
2. Backend (models → routes → Claude integration)
3. Frontend (screens in order listed)
4. Integration testing
5. Seed data

Do not move to the next phase until the current one works end-to-end.

---

## What You're Building

A React Native mobile app where users answer one AI-evaluated interview question per day and maintain a streak.

**Core loop:** Open app → see today's question → type answer → get AI score + feedback → streak updates → come back tomorrow.

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Frontend | React Native (Expo) | SDK 51+ |
| Backend | Node.js + Express | Node 20+ |
| Database | MongoDB Atlas | via Mongoose |
| AI | Anthropic Claude API | `claude-sonnet-4-20250514` |
| Auth | Clerk | Latest |
| Push Notifications | Expo Push Notifications | Built into Expo |
| Backend Hosting | Vercel | — |
| DB Hosting | MongoDB Atlas | Free tier |

---

## Project Structure

```
kairos/
├── apps/
│   ├── mobile/          # Expo React Native app
│   │   ├── app/         # Expo Router file-based routing
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in.tsx
│   │   │   │   └── sign-up.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx        # Home
│   │   │   │   ├── history.tsx      # History
│   │   │   │   └── profile.tsx      # Profile
│   │   │   ├── answer.tsx           # Answer screen
│   │   │   ├── result.tsx           # Result screen
│   │   │   └── onboarding.tsx       # Onboarding
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   └── api.ts               # All API calls — centralized here
│   │   └── constants/
│   └── api/             # Express backend
│       ├── src/
│       │   ├── models/
│       │   │   ├── User.ts
│       │   │   ├── Question.ts
│       │   │   ├── Answer.ts
│       │   │   └── Streak.ts
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── question.ts
│       │   │   ├── answer.ts
│       │   │   └── streak.ts
│       │   ├── services/
│       │   │   ├── claude.ts        # Claude API calls — only here
│       │   │   └── streak.ts        # Streak logic — only here
│       │   ├── middleware/
│       │   │   └── requireAuth.ts   # Clerk JWT verification
│       │   ├── lib/
│       │   │   └── db.ts            # MongoDB connection
│       │   └── index.ts             # Express app entry
│       └── seed/
│           └── questions.ts         # Seed script
```

---

## Environment Variables

### Backend (`apps/api/.env`)
```
MONGODB_URI=
ANTHROPIC_API_KEY=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
PORT=3000
```

### Mobile (`apps/mobile/.env`)
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

Never hardcode any of these values. Always read from env.

---

## Data Models

### User
```ts
{
  _id: ObjectId,
  clerkId: string,          // unique, indexed
  name: string,
  email: string,
  profile: {
    role: "student" | "professional",
    level: "beginner" | "intermediate" | "advanced",
    targets: string[],      // e.g. ["FAANG", "Startup"]
    notificationTime: string // "09:00" default
  },
  createdAt: Date
}
```

### Question
```ts
{
  _id: ObjectId,
  category: "DSA" | "OS" | "DBMS" | "Networks" | "OOP" | "SystemDesign" | "Behavioral",
  difficulty: "easy" | "medium" | "hard",
  text: string,
  rubricHints: string       // hints for Claude to evaluate against — not shown to user
}
```

### Answer
```ts
{
  _id: ObjectId,
  userId: ObjectId,         // ref: User
  questionId: ObjectId,     // ref: Question
  date: string,             // "YYYY-MM-DD" — NOT a Date object, a string
  answerText: string,
  score: number,            // 1-10
  feedback: string,
  modelAnswer: string,
  createdAt: Date
}
```

### Streak
```ts
{
  _id: ObjectId,
  userId: ObjectId,         // ref: User, unique
  current: number,          // default 0
  longest: number,          // default 0
  lastActiveDate: string,   // "YYYY-MM-DD"
  freezesRemaining: number  // default 1, max 1
}
```

---

## API Endpoints

Base URL: `/api`

All endpoints except `/api/auth/sync` require `Authorization: Bearer <clerk_jwt>` header. Verify using Clerk's backend SDK. Return `401` if invalid.

Always return JSON. Error format: `{ error: string }`.

---

### POST `/api/auth/sync`
Called on every app launch after Clerk login.

**Request body:**
```json
{ "clerkId": "string", "name": "string", "email": "string" }
```

**Logic:**
- `findOneAndUpdate` by `clerkId` with `upsert: true`
- If new user (upserted): also create a Streak document with defaults
- Return the full User document

**Response:** `200 { user }`

---

### POST `/api/auth/onboarding`
Called once after user completes onboarding screen.

**Request body:**
```json
{
  "role": "student",
  "level": "beginner",
  "targets": ["FAANG"],
  "notificationTime": "09:00"
}
```

**Logic:** Update `profile` on User document.

**Response:** `200 { user }`

---

### GET `/api/question/today`
Returns today's question for the authenticated user.

**Logic (in order):**
1. Get today's date string: `new Date().toISOString().split('T')[0]`
2. Check if an Answer already exists for this user + today's date
3. If yes: return `{ question, answer, alreadyAnswered: true }`
4. If no: run question selection (see Question Serving Logic below)
5. Return `{ question, alreadyAnswered: false }`

**Response:** `200 { question, answer?, alreadyAnswered: boolean }`

---

### POST `/api/answer/submit`
Submit an answer and get AI evaluation.

**Request body:**
```json
{ "questionId": "string", "answerText": "string" }
```

**Logic:**
1. Check no Answer exists for this user + today's date. If one exists, return `400 { error: "Already answered today" }`
2. Fetch the Question by ID
3. Call Claude (see Claude Evaluation section)
4. Save Answer document with score, feedback, modelAnswer
5. Call streak update service (see Streak Logic)
6. Return full result

**Response:** `200 { score, feedback, modelAnswer, streak: { current, longest } }`

---

### GET `/api/answer/history`
Returns all answers for the authenticated user, newest first.

**Logic:** Find all Answers by userId, populate questionId, sort by createdAt desc.

**Response:** `200 { answers: [{ answer, question }] }`

---

### GET `/api/streak`
Returns current streak for the authenticated user.

**Response:** `200 { current, longest, lastActiveDate, freezesRemaining }`

---

### POST `/api/streak/freeze`
Use a streak freeze.

**Logic:**
1. Fetch streak
2. If `freezesRemaining < 1`: return `400 { error: "No freezes remaining" }`
3. Decrement `freezesRemaining`
4. Set `lastActiveDate` to today (prevents reset)
5. Save and return

**Response:** `200 { streak }`

---

## Claude Evaluation

All Claude API logic lives in `apps/api/src/services/claude.ts`. Never call the Claude API from a route file directly.

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function evaluateAnswer(
  questionText: string,
  rubricHints: string,
  userAnswer: string
): Promise<{ score: number; feedback: string; modelAnswer: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a senior software engineer conducting a mock technical interview.

Question: ${questionText}
Rubric (internal — do not repeat this to the candidate): ${rubricHints}
Candidate's answer: ${userAnswer}

Evaluate the answer honestly but encouragingly. Return ONLY valid JSON with no markdown fences, no preamble, no trailing text:
{
  "score": <integer from 1 to 10>,
  "feedback": "<2-3 sentences: acknowledge what was correct, then clearly state what key concepts were missing or could be stronger>",
  "modelAnswer": "<a complete, well-structured answer that would score 9-10 in a real interview>"
}`
      }
    ]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text);
  } catch {
    // If Claude returns malformed JSON despite instructions, extract manually
    const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
    throw new Error(`Claude returned unparseable response. Raw: ${text.slice(0, 200)}`);
  }
}
```

**Error handling:** If Claude call fails, return `500 { error: "Evaluation failed. Try again." }`. Do not save a partial Answer.

---

## Question Serving Logic

In `GET /api/question/today`, if no answer exists for today:

```
1. Get all questionIds the user has already answered (from Answer collection)
2. Get unanswered questions: Question.find({ _id: { $nin: answeredIds } })
3. If unanswered questions exist:
   a. Get user's average score per category from Answer history
   b. Find the category with the lowest average (or unattempted category)
   c. Filter unanswered questions for that category
   d. If none in that category, fall back to any unanswered question
   e. Pick one randomly from the filtered set
4. If all questions answered (unlikely in MVP but handle it):
   a. Find the Answer with the oldest date for this user
   b. Return that question (re-serve it)
```

---

## Streak Logic

All streak logic lives in `apps/api/src/services/streak.ts`.

```ts
export async function updateStreakOnAnswer(userId: string): Promise<Streak> {
  const streak = await Streak.findOne({ userId });
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (streak.lastActiveDate === today) {
    // Already answered today, no change
    return streak;
  }

  if (streak.lastActiveDate === yesterday) {
    // Consecutive day
    streak.current += 1;
  } else {
    // Streak broken
    streak.current = 1;
  }

  streak.longest = Math.max(streak.current, streak.longest);
  streak.lastActiveDate = today;
  await streak.save();
  return streak;
}
```

**Freeze refill:** Every Monday, `freezesRemaining` resets to 1. Implement this as a check inside `GET /api/streak` — if today is Monday and the last refill wasn't this Monday, reset to 1. Store `lastFreezeRefill: string` (date) on Streak model to track this.

---

## Auth Middleware

```ts
// middleware/requireAuth.ts
import { clerkClient } from "@clerk/clerk-sdk-node";

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = await clerkClient.verifyToken(token);
    req.clerkId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
```

Apply this middleware to all routes except `/api/auth/sync`.

---

## Frontend Screens

Use Expo Router for navigation. All API calls go through `lib/api.ts` — never call `fetch` directly from a screen.

### lib/api.ts pattern
```ts
const BASE = process.env.EXPO_PUBLIC_API_URL;

async function request(path: string, options: RequestInit = {}) {
  const token = await getClerkToken(); // from useAuth() hook
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export const api = {
  syncUser: (data) => request("/api/auth/sync", { method: "POST", body: JSON.stringify(data) }),
  completeOnboarding: (data) => request("/api/auth/onboarding", { method: "POST", body: JSON.stringify(data) }),
  getTodayQuestion: () => request("/api/question/today"),
  submitAnswer: (data) => request("/api/answer/submit", { method: "POST", body: JSON.stringify(data) }),
  getHistory: () => request("/api/answer/history"),
  getStreak: () => request("/api/streak"),
  useFreeze: () => request("/api/streak/freeze", { method: "POST" }),
};
```

---

### Screen 1: Onboarding (`onboarding.tsx`)
Shown only once — after first Clerk sign-up, before Home.

**Fields:**
- Role: "Student" / "Professional" (button toggle)
- Level: "Beginner" / "Intermediate" / "Advanced" (button toggle)
- Target companies: multi-select chips — FAANG, Product, Service, Startup
- Notification time: time picker (default 09:00)

**On submit:** Call `api.completeOnboarding(data)`, then navigate to `/(tabs)/`

**Logic to show onboarding:** In `_layout.tsx`, after `api.syncUser()`, check if `user.profile.role` is null/undefined. If so, redirect to `/onboarding`.

---

### Screen 2: Home (`(tabs)/index.tsx`)
The main screen. Loaded on every app open.

**On mount:** Call `api.getTodayQuestion()`

**State A — Not answered today (`alreadyAnswered: false`):**
- Show streak count prominently at top (e.g. "🔥 12 day streak")
- Show category tag (e.g. "System Design")
- Show question text
- CTA button: "Answer Now" → navigates to `/answer` passing `questionId`

**State B — Already answered today (`alreadyAnswered: true`):**
- Show streak count
- Show "You're done for today ✓"
- Show today's score (e.g. "Today's score: 7/10")
- Show a preview of feedback
- CTA: "View full result" → navigates to `/result` passing answerId

**Loading state:** Show skeleton placeholder, not a spinner.
**Error state:** Show "Couldn't load question. Tap to retry."

---

### Screen 3: Answer (`answer.tsx`)
Receives `questionId` as route param.

**Layout:**
- Question text at top (non-editable, prominent)
- Category + difficulty badge
- Multiline TextInput (min 4 lines, max uncapped)
- Character count display (e.g. "142 chars")
- Submit button — disabled if input is empty or < 20 characters

**On submit:**
1. Disable button, show loading indicator inside button ("Evaluating...")
2. Call `api.submitAnswer({ questionId, answerText })`
3. On success: navigate to `/result` passing the full result data
4. On error: show inline error toast, re-enable button

**Do not allow back navigation during submission** (disable back gesture while loading).

---

### Screen 4: Result (`result.tsx`)
Receives result data as route params or from navigation state.

**Layout:**
- Score display: large number "7/10" with color coding:
  - 1-4: red (`#EF4444`)
  - 5-7: amber (`#F59E0B`)
  - 8-10: green (`#10B981`)
- Streak update: "🔥 Streak: 13 days" (animate the number incrementing)
- Feedback section: label "What to improve" + feedback text
- Model answer section: collapsible by default — user taps to expand
- Bottom CTA: "Back to Home"

**No back navigation to Answer screen** — replace the route, don't push.

---

### Screen 5: History (`(tabs)/history.tsx`)

**On mount:** Call `api.getHistory()`

**Layout:**
- List of past answers, grouped by date (today, yesterday, then dates)
- Each item shows: question text (truncated to 2 lines), category badge, score badge
- Tap item → expand inline to show full feedback and model answer (accordion)

**Empty state:** "No answers yet. Answer today's question to get started."

---

### Screen 6: Profile (`(tabs)/profile.tsx`)

**Sections:**
- User name + email (from Clerk)
- Stats: current streak, longest streak, total questions answered, average score
- Preferences: role, level, targets, notification time (all editable — re-call `api.completeOnboarding` on save)
- Streak freeze: show "1 freeze available" or "0 freezes remaining", with "Use Freeze" button (only show if streak > 0)
- Sign out button (Clerk `signOut()`)

---

## Push Notifications

Use `expo-notifications`.

**Request permission** on onboarding completion.

**Schedule a daily local notification:**
```ts
import * as Notifications from 'expo-notifications';

export async function scheduleDailyReminder(time: string) {
  // time is "HH:MM"
  const [hours, minutes] = time.split(':').map(Number);

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your Kairos question is waiting",
      body: "Keep your streak alive. 2 minutes is all it takes.",
      sound: true,
    },
    trigger: {
      hour: hours,
      minute: minutes,
      repeats: true,
    },
  });
}
```

Call this on onboarding completion and whenever notification time is updated in Profile.

---

## Seed Data

Run with: `npx ts-node seed/questions.ts`

Seed exactly 30 questions — minimum 4 per category. Each must have:
- Realistic `text` (as it would appear in a real interview)
- Meaningful `rubricHints` (key concepts Claude should check for)
- Appropriate `difficulty`

Example entries:

```ts
{
  category: "OS",
  difficulty: "medium",
  text: "What is the difference between a process and a thread? When would you use one over the other?",
  rubricHints: "Should mention: separate memory space for processes vs shared memory for threads, context switch cost, use threads for shared state (e.g. server handling requests), use processes for isolation (e.g. browser tabs). Bonus: GIL in CPython, race conditions, mutex/locks."
},
{
  category: "SystemDesign",
  difficulty: "hard",
  text: "Design a URL shortener like bit.ly. Walk me through your approach.",
  rubricHints: "Should cover: hashing strategy (MD5/base62), collision handling, database choice (KV store like Redis + persistent DB), read-heavy optimization (caching), scale considerations (horizontal scaling, CDN for redirects). Bonus: analytics, custom slugs, expiry."
},
{
  category: "DSA",
  difficulty: "easy",
  text: "Explain the sliding window technique. What class of problems is it useful for?",
  rubricHints: "Should mention: maintaining a window of fixed or variable size over an array/string, O(n) vs O(n^2) brute force, useful for subarray/substring problems like max sum subarray, longest substring without repeat. Should give at least one concrete example."
}
```

---

## Error Handling Rules

Follow these throughout the codebase:

1. **All async route handlers must be wrapped in try/catch.** Use an Express error handler as a catch-all:
```ts
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
```

2. **Never return a 500 with raw error messages** — log internally, return generic message to client.

3. **Claude API failures must not corrupt state.** If Claude fails, do not save the Answer document.

4. **MongoDB connection must be verified before starting the server.** Connect first, listen after:
```ts
mongoose.connect(process.env.MONGODB_URI).then(() => {
  app.listen(PORT, () => console.log(`API running on ${PORT}`));
}).catch(err => {
  console.error("DB connection failed", err);
  process.exit(1);
});
```

5. **All frontend API calls must have loading + error state.** No screen should ever be stuck loading silently.

---

## Code Quality Rules

1. Use TypeScript everywhere. No `any` types except where genuinely unavoidable (mark with `// eslint-disable-next-line`).
2. Use Mongoose schemas with strict typing — define an interface for each model.
3. No business logic in route files. Routes call services. Services do the work.
4. All date comparisons use the `"YYYY-MM-DD"` string format — never compare raw Date objects for streak logic.
5. No inline styles in React Native — use `StyleSheet.create()`.
6. Name components with PascalCase, hooks with `use` prefix, utility functions with camelCase.

---

## Testing Checklist

Before considering the build complete, verify each item manually:

**Auth**
- [ ] New user sign up → onboarding screen shown
- [ ] Returning user sign in → onboarding skipped, goes to Home
- [ ] Unauthenticated API call → 401 returned

**Question & Answer**
- [ ] Home screen loads today's question
- [ ] Submitting a blank or short answer is blocked by the UI
- [ ] Answer submits → Claude evaluates → Result screen shows score, feedback, model answer
- [ ] Submitting again today returns 400 from API
- [ ] Home screen reflects "already answered" state on next open

**Streak**
- [ ] Answering on day 1 sets streak to 1
- [ ] Answering on day 2 increments to 2
- [ ] Skipping a day resets streak to 1
- [ ] Freeze prevents reset
- [ ] Freeze count decrements after use
- [ ] Freeze refills to 1 on Monday

**History**
- [ ] All past answers appear in History tab
- [ ] Tapping an entry expands feedback

**Notifications**
- [ ] Notification permission requested on onboarding
- [ ] Daily notification fires at the set time

---

## What NOT to Build

Do not build any of the following. They are out of scope for this version:

- Voice answer input
- Peer leaderboards or social features
- Company-specific question tracks
- Radar/spider chart for category scores
- Payments or Pro tier
- Web version
- Admin dashboard
- Email notifications (only push)

If you encounter a feature not described in this document, skip it and add a `// TODO: out of scope` comment.

---

## Definition of Done

The build is complete when:
1. A new user can sign up, complete onboarding, answer today's question, and see an AI-evaluated score
2. Streak correctly increments on consecutive days and resets on a miss
3. History tab shows all past answers
4. Push notification fires daily at the configured time
5. All items in the Testing Checklist above pass
