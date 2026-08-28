import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  passwordConditions,
  passwordStrength,
  type PasswordStrength,
} from "@kairos/shared";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link to="/" className="brand brand-large">
          Kairos
        </Link>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

const STRENGTH_PCT: Record<PasswordStrength, number> = {
  empty: 0,
  weak: 20,
  fair: 45,
  medium: 70,
  strong: 100,
};

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  empty: "",
  weak: "Weak",
  fair: "Fair",
  medium: "Medium",
  strong: "Strong",
};

export function PasswordField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const strength = passwordStrength(value);
  const conditions = passwordConditions(value);
  const showMeter = value.length > 0;
  return (
    <>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" />
      {showMeter && (
        <>
          <span className="pw-meter" aria-hidden="true">
            <span
              className={`pw-meter-fill ${strength === "empty" ? "" : strength}`}
              style={{ width: `${STRENGTH_PCT[strength]}%` }}
            />
          </span>
          <span className={`pw-label ${strength === "empty" ? "" : strength}`}>
            {STRENGTH_LABEL[strength]}
          </span>
        </>
      )}
      <ul className="pw-checklist">
        {conditions.map((c) => (
          <li key={c.key} className={c.met ? "met" : ""}>
            <span className="pw-check" aria-hidden="true">{c.met ? "✓" : ""}</span>
            {c.label}
          </li>
        ))}
      </ul>
      {error ? <span className="field-error">{error}</span> : null}
    </>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="banner banner-error">{message}</div>;
}

export function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="banner banner-success">{message}</div>;
}
