import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import { WebPushCard } from "../components/WebPushCard";
import { ErrorBanner, Field, SuccessBanner } from "../components/forms";

interface Prefs {
  pushEnabled: boolean;
  evalNotifications: boolean;
  streakReminder: boolean;
  reminderTime: string;
}

export function Settings() {
  const { theme, resolved, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busyPw, setBusyPw] = useState(false);

  useEffect(() => {
    api
      .get<{ prefs: Prefs }>("/api/notifications/prefs")
      .then(({ prefs: p }) => setPrefs(p))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"));
  }, []);

  async function savePrefs(e: FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setError(null);
    setSaved(false);
    try {
      const { prefs: updated } = await api.put<{ prefs: Prefs }>("/api/notifications/prefs", prefs);
      setPrefs(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    setBusyPw(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPwSaved(true);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusyPw(false);
    }
  }

  if (!prefs) {
    return <div className="card">{error ?? "Loading…"}</div>;
  }

  return (
    <div className="stack">
      <div className="card">
        <h2 className="card-title">Appearance</h2>
        <div className="segmented">
          <button type="button" className={theme === "light" ? "seg-active" : ""} onClick={() => setTheme("light")}>
            Light
          </button>
          <button type="button" className={theme === "dark" ? "seg-active" : ""} onClick={() => setTheme("dark")}>
            Dark
          </button>
          <button type="button" className={theme === "system" ? "seg-active" : ""} onClick={() => setTheme("system")}>
            System
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Currently using {resolved === "dark" ? "dark" : "light"} mode.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Notification preferences</h2>
        <form onSubmit={savePrefs} className="form">
          <ErrorBanner message={error} />
          <SuccessBanner message={saved ? "Preferences saved." : null} />
          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.pushEnabled}
              onChange={(e) => setPrefs({ ...prefs, pushEnabled: e.target.checked })}
            />
            Enable push notifications
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.evalNotifications}
              onChange={(e) => setPrefs({ ...prefs, evalNotifications: e.target.checked })}
            />
            Notify me when an answer is evaluated
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.streakReminder}
              onChange={(e) => setPrefs({ ...prefs, streakReminder: e.target.checked })}
            />
            Daily streak reminder
          </label>
          <Field label="Reminder time">
            <input
              type="time"
              value={prefs.reminderTime}
              onChange={(e) => setPrefs({ ...prefs, reminderTime: e.target.value })}
            />
          </Field>
          <button className="btn btn-primary" type="submit">
            Save preferences
          </button>
        </form>
      </div>

      <WebPushCard />

      <div className="card">
        <h2 className="card-title">Change password</h2>
        <form onSubmit={changePassword} className="form">
          <ErrorBanner message={pwError} />
          <SuccessBanner message={pwSaved ? "Password changed. You've been signed out everywhere else." : null} />
          <Field label="Current password">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="New password">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </Field>
          <button className="btn btn-primary" disabled={busyPw} type="submit">
            {busyPw ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
