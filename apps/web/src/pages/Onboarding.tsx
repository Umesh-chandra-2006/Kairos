import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { SkillLevel, UserRole } from "@kairos/shared";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner } from "../components/forms";

const GOALS = [
  { id: "campus", label: "Campus placements", icon: "🏫" },
  { id: "offcampus", label: "Off-campus jobs", icon: "💼" },
  { id: "specific", label: "A specific company", icon: "🎯" },
  { id: "freelance", label: "Freelancing", icon: "🌐" },
];

const TARGETS = [
  "DSA", "Operating Systems", "DBMS", "Networks",
  "OOP", "System Design", "Behavioral",
];

const LEVELS: { id: SkillLevel; label: string; desc: string }[] = [
  { id: "beginner", label: "Beginner", desc: "New to interview prep" },
  { id: "intermediate", label: "Intermediate", desc: "Some practice done" },
  { id: "advanced", label: "Advanced", desc: "Refining my skills" },
];

export function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("campus");
  const [role, setRole] = useState<UserRole>("student");
  const [level, setLevel] = useState<SkillLevel>("intermediate");
  const [targets, setTargets] = useState<string[]>(["DSA"]);
  const [notificationTime, setNotificationTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleTarget(t: string) {
    setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await completeOnboarding({
        role,
        level,
        targets: [goal === "campus" ? "Campus Placements" : goal === "offcampus" ? "Off-Campus" : goal === "specific" ? "Company Prep" : "Freelancing", ...targets],
        notificationTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences");
    } finally {
      setBusy(false);
    }
  }

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="onboarding">
        <div className="auth-card onboarding-welcome">
          <div className="onboarding-logo">K</div>
          <h1 className="auth-title">Welcome to Kairos</h1>
          <p className="auth-subtitle">Ace your next interview. One question a day.</p>
          <div className="onboarding-features">
            <div className="onboarding-feature">
              <span className="feature-icon">📝</span>
              <span>Daily practice questions across 7 topics</span>
            </div>
            <div className="onboarding-feature">
              <span className="feature-icon">🎙️</span>
              <span>Voice practice with real-time feedback</span>
            </div>
            <div className="onboarding-feature">
              <span className="feature-icon">📊</span>
              <span>Track your skills across 10 dimensions</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={next}>Get started</button>
          {user?.name && <p className="onboarding-greeting">Signed in as {user.name}</p>}
        </div>
      </div>
    );
  }

  // Step 1: Goal
  if (step === 1) {
    return (
      <div className="onboarding">
        <div className="auth-card">
          <div className="onboarding-step">1 of 4</div>
          <h1 className="auth-title">What's your goal?</h1>
          <p className="auth-subtitle">We'll tailor your prep experience.</p>
          <div className="onboarding-goals">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`onboarding-goal${goal === g.id ? " goal-active" : ""}`}
                onClick={() => setGoal(g.id)}
              >
                <span className="goal-icon">{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
          <div className="onboarding-nav">
            <button className="btn btn-secondary" onClick={back}>Back</button>
            <button className="btn btn-primary" onClick={next}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Level
  if (step === 2) {
    return (
      <div className="onboarding">
        <div className="auth-card">
          <div className="onboarding-step">2 of 4</div>
          <h1 className="auth-title">Your skill level</h1>
          <p className="auth-subtitle">This helps us pick the right difficulty.</p>
          <div className="onboarding-levels">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`onboarding-level${level === l.id ? " level-active" : ""}`}
                onClick={() => setLevel(l.id)}
              >
                <span className="level-label">{l.label}</span>
                <span className="level-desc">{l.desc}</span>
              </button>
            ))}
          </div>
          <div className="onboarding-nav">
            <button className="btn btn-secondary" onClick={back}>Back</button>
            <button className="btn btn-primary" onClick={next}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Topics + reminder
  if (step === 3) {
    return (
      <div className="onboarding">
        <div className="auth-card">
          <div className="onboarding-step">3 of 4</div>
          <h1 className="auth-title">Pick your topics</h1>
          <p className="auth-subtitle">Choose at least one. You can change this later.</p>
          <div className="chip-grid">
            {TARGETS.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip${targets.includes(t) ? " chip-active" : ""}`}
                onClick={() => toggleTarget(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="onboarding-reminder">
            <label className="field-label">Daily reminder time</label>
            <input type="time" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} />
          </div>
          <div className="onboarding-nav">
            <button className="btn btn-secondary" onClick={back}>Back</button>
            <button className="btn btn-primary" onClick={next}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Confirm & submit
  return (
    <div className="onboarding">
      <div className="auth-card">
        <div className="onboarding-step">4 of 4</div>
        <h1 className="auth-title">You're all set!</h1>
        <p className="auth-subtitle">Here's your setup:</p>
        <div className="onboarding-summary">
          <div className="summary-row"><span>Goal</span><span>{GOALS.find((g) => g.id === goal)?.label}</span></div>
          <div className="summary-row"><span>Level</span><span>{LEVELS.find((l) => l.id === level)?.label}</span></div>
          <div className="summary-row"><span>Topics</span><span>{targets.join(", ")}</span></div>
          <div className="summary-row"><span>Reminder</span><span>{notificationTime}</span></div>
        </div>
        <ErrorBanner message={error} />
        <div className="onboarding-nav">
          <button className="btn btn-secondary" onClick={back} disabled={busy}>Back</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={busy}>
            {busy ? "Saving..." : "Start prepping"}
          </button>
        </div>
      </div>
    </div>
  );
}
