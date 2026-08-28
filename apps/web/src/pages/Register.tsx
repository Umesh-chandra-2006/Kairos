import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { validateRegisterForm, type RegisterFormErrors } from "@kairos/shared";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell, ErrorBanner, Field, PasswordField } from "../components/forms";

const REFERRAL_STORAGE_KEY = "kairos_referral_code";
const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined;

declare global {
  interface Window {
    turnstile?: { render: (container: HTMLElement, opts: Record<string, unknown>) => string; reset: (widgetId: string) => void; getResponse: (widgetId: string) => string | undefined };
  }
}

function loadTurnstileScript(onReady: () => void) {
  if (window.turnstile) {
    onReady();
    return;
  }
  if (document.getElementById("turnstile-script")) {
    const existing = document.getElementById("turnstile-script");
    if (existing) existing.addEventListener("load", onReady, { once: true });
    return;
  }
  const script = document.createElement("script");
  script.id = "turnstile-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.onload = onReady;
  document.head.appendChild(script);
}

function errorsFromApi(err: unknown): RegisterFormErrors {
  if (err instanceof ApiError) {
    const mapped: RegisterFormErrors = {};
    for (const d of err.details ?? []) {
      const field = d.path[0];
      if (field === "name" || field === "email" || field === "password") mapped[field] = d.message;
    }
    return mapped;
  }
  return {};
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreeToS, setAgreeToS] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmDirty = useRef(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileReady = useRef(false);

  useEffect(() => {
    if (!TURNSTILE_SITEKEY) return;
    loadTurnstileScript(() => {
      turnstileReady.current = true;
      renderTurnstile();
    });
  }, []);

  function renderTurnstile() {
    if (!turnstileRef.current || !window.turnstile) return;
    turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITEKEY,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(null),
    });
  }

  function resetTurnstile() {
    if (turnstileWidgetId.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId.current);
      setTurnstileToken(null);
    } else if (turnstileReady.current) {
      renderTurnstile();
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = validateRegisterForm({ name, email, password, confirm });
    if (!agreeToS) errors.confirm = "You must agree to the Terms of Service";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    try {
      const referralCode = localStorage.getItem(REFERRAL_STORAGE_KEY) || undefined;
      await register(name.trim(), email.trim(), password, referralCode, turnstileToken ?? undefined);
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        const apiErrors = errorsFromApi(err);
        if (Object.keys(apiErrors).length > 0) {
          setFieldErrors(apiErrors);
        } else {
          setError(err.message);
          if (/CAPTCHA/i.test(err.message)) resetTurnstile();
        }
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="One question a day. Ten minutes. Interview-ready.">
      <form onSubmit={onSubmit} className="form" noValidate>
        <ErrorBanner message={error} />
        <Field label="Name" error={fieldErrors.name}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" error={fieldErrors.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" error={fieldErrors.password}>
          <PasswordField value={password} onChange={setPassword} />
        </Field>
        <Field label="Confirm password" error={confirmDirty.current && confirm !== password && confirm.length > 0 ? "Passwords do not match" : fieldErrors.confirm}>
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              confirmDirty.current = true;
              setConfirm(e.target.value);
            }}
            autoComplete="new-password"
          />
        </Field>
        <label className="checkbox-row">
          <input type="checkbox" checked={agreeToS} onChange={(e) => setAgreeToS(e.target.checked)} />
          <span>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link></span>
        </label>
        {TURNSTILE_SITEKEY && <div ref={turnstileRef} style={{ marginTop: 4, marginBottom: 8 }} />}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Creating…" : "Create account"}
        </button>
        {/* Honeypot fields — hidden from humans, bots auto-fill them */}
        <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
          <input type="text" name="_website" tabIndex={-1} autoComplete="off" />
          <input type="text" name="_email_confirm" tabIndex={-1} autoComplete="off" />
        </div>
      </form>
      <div className="link-row">
        <Link to="/login">Already have an account?</Link>
      </div>
    </AuthShell>
  );
}
