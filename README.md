# Kairos

> Answer one AI-evaluated interview question per day. Keep your streak. Master your interviews.

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native (Expo SDK 54, Expo Router) |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| AI | Google Gemini (`gemini-2.0-flash`) |
| Auth | Clerk |
| Push Notifications | Expo Notifications (EAS Dev Build) |

---

## Setup

### 1. Backend

```bash
cd apps/api
cp .env.example .env
# Fill in MONGODB_URI, GEMINI_API_KEY, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY
npm install
npm run seed        # Seeds 30 interview questions
npm run dev         # Starts on port 3000
```

### 2. Mobile

```bash
cd apps/mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
# Set EXPO_PUBLIC_API_URL to your backend URL
npm install
npx expo start      # Scan QR with Expo Go (or dev build for push notifications)
```

### 3. EAS Dev Build (for Push Notifications)

```bash
cd apps/mobile
npm install -g eas-cli
eas login
eas build --profile development --platform android   # or ios
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/sync` | Upsert user on login |
| POST | `/api/auth/onboarding` | Save profile preferences |
| GET | `/api/question/today` | Get today's question |
| POST | `/api/answer/submit` | Submit answer → Gemini eval |
| GET | `/api/answer/history` | All past answers |
| GET | `/api/streak` | Current streak info |
| POST | `/api/streak/freeze` | Use streak freeze |

---

## Screens

| Screen | Route | Description |
|---|---|---|
| Sign In | `/(auth)/sign-in` | Clerk email/password |
| Sign Up | `/(auth)/sign-up` | Clerk email + verification |
| Onboarding | `/onboarding` | Role, level, targets, notification time |
| Home | `/(tabs)/` | Today's question or completed state |
| Answer | `/answer` | Write and submit answer |
| Result | `/result` | Score, feedback, model answer |
| History | `/(tabs)/history` | All past answers (accordion) |
| Profile | `/(tabs)/profile` | Stats, preferences, freeze, sign out |
