import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { SkillLevel, UserRole } from "@kairos/shared";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner, Field } from "../components/forms";

const TARGETS = [
  "DSA",
  "Operating Systems",
  "DBMS",
  "Networks",
  "OOP",
  "System Design",
  "Behavioral",
];

export function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("student");
  const [level, setLevel] = useState<SkillLevel>("intermediate");
  const [targets, setTargets] = useState<string[]>(["DSA"]);
  const [notificationTime, setNotificationTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await completeOnboarding({
        role,
        level,
        targets,
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

  function toggleTarget(t: string) {
    setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <div className="onboarding">
      <div className="auth-card">
        <h1 className="auth-title">Let's set you up, {user?.name ?? "friend"}</h1>
        <p className="auth-subtitle">We'll tailor your daily questions to these preferences.</p>
        <form onSubmit={onSubmit} className="form">
          <ErrorBanner message={error} />

          <Field label="I am a">
            <div className="segmented">
              <button type="button" className={role === "student" ? "seg-active" : ""} onClick={() => setRole("student")}>
                Student
              </button>
              <button type="button" className={role === "professional" ? "seg-active" : ""} onClick={() => setRole("professional")}>
                Professional
              </button>
            </div>
          </Field>

          <Field label="Skill level">
            <select value={level} onChange={(e) => setLevel(e.target.value as SkillLevel)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>

          <Field label="What are you preparing for?">
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
          </Field>

          <Field label="Daily reminder time">
            <input type="time" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} required />
          </Field>

          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Saving…" : "Start prepping"}
          </button>
        </form>
      </div>
    </div>
  );
}
