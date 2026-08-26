import { useEffect, useState } from "react";
import { api } from "../api/client";

const CONSENT_KEY = "kairos_cookie_consent";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem(CONSENT_KEY);
    if (!consented) setVisible(true);
  }, []);

  if (!visible) return null;

  async function accept() {
    try {
      await api.accountConsent("analytics_and_cookies", true);
    } catch {
      /* best effort */
    }
    localStorage.setItem(CONSENT_KEY, "true");
    setVisible(false);
  }

  async function decline() {
    try {
      await api.accountConsent("analytics_and_cookies", false);
    } catch {
      /* best effort */
    }
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  return (
    <div className="consent-banner">
      <p>
        We use cookies to keep you logged in and improve your experience. By continuing, you agree to our use of
        essential cookies. See our <a href="/privacy">Privacy Policy</a> for details.
      </p>
      <button className="btn btn-primary" onClick={() => void accept()}>
        Accept
      </button>
      <button className="btn btn-ghost" onClick={() => void decline()}>
        Decline
      </button>
    </div>
  );
}
