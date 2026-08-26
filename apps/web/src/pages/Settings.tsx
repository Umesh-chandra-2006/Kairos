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

interface AccountStats {
  memberSince: string;
  totalAnswers: number;
  currentStreak: number;
  longestStreak: number;
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
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ prefs: Prefs }>("/api/notifications/prefs")
      .then(({ prefs: p }) => setPrefs(p))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"));
    api
      .get<{ stats: AccountStats }>("/api/account/stats")
      .then(({ stats: s }) => setStats(s))
      .catch(() => undefined);
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

  async function exportData() {
    setExporting(true);
    try {
      const token = (await import("../api/client")).getAccessToken();
      const res = await fetch("/api/account/export", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kairos-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export data");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteMsg(null);
    setError(null);
    try {
      const result = await api.post<{ message: string }>("/api/account/delete", { confirm: deleteConfirm });
      setDeleteMsg(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleting(false);
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

      {stats && (
        <div className="card">
          <h2 className="card-title">Account Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.totalAnswers}</span>
              <span className="stat-label">Answers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.currentStreak}</span>
              <span className="stat-label">Current Streak</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.longestStreak}</span>
              <span className="stat-label">Longest Streak</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : "—"}</span>
              <span className="stat-label">Member Since</span>
            </div>
          </div>
        </div>
      )}

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

      <div className="card">
        <h2 className="card-title">Your Data</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Export all your data or request account deletion as per GDPR.
        </p>
        <div className="row-gap">
          <button className="btn btn-primary" onClick={() => void exportData()} disabled={exporting}>
            {exporting ? "Exporting…" : "Download my data (JSON)"}
          </button>
        </div>
      </div>

      <div className="card card-danger">
        <h2 className="card-title" style={{ color: "var(--danger)" }}>Delete Account</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          This action is irreversible. Your account and all data will be permanently anonymized.
        </p>
        <ErrorBanner message={error} />
        <SuccessBanner message={deleteMsg} />
        {!deleteMsg && (
          <form onSubmit={deleteAccount} className="form">
            <Field label='Type DELETE_MY_ACCOUNT to confirm'>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE_MY_ACCOUNT"
                required
              />
            </Field>
            <button className="btn btn-danger" disabled={deleting || deleteConfirm !== "DELETE_MY_ACCOUNT"} type="submit">
              {deleting ? "Deleting…" : "Permanently delete my account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
