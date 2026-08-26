import { useEffect, useState } from "react";
import { api } from "../api/client";

const CONSENT_KEY = "kairos_cookie_consent";

interface ConsentPrefs {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPrefs>({ essential: true, analytics: false, marketing: false });

  useEffect(() => {
    const consented = localStorage.getItem(CONSENT_KEY);
    if (!consented) setVisible(true);
  }, []);

  if (!visible) return null;

  async function save() {
    try {
      await api.accountConsent("analytics_and_cookies", prefs.analytics);
      await api.accountConsent("marketing", prefs.marketing);
    } catch {
      /* best effort */
    }
    localStorage.setItem(CONSENT_KEY, "granular");
    setVisible(false);
  }

  function acceptAll() {
    setPrefs({ essential: true, analytics: true, marketing: true });
    setTimeout(() => {
      void (async () => {
        try {
          await api.accountConsent("analytics_and_cookies", true);
          await api.accountConsent("marketing", true);
        } catch { /* best effort */ }
        localStorage.setItem(CONSENT_KEY, "all");
        setVisible(false);
      })();
    }, 0);
  }

  function declineAll() {
    setPrefs({ essential: true, analytics: false, marketing: false });
    setTimeout(() => {
      void (async () => {
        try {
          await api.accountConsent("analytics_and_cookies", false);
          await api.accountConsent("marketing", false);
        } catch { /* best effort */ }
        localStorage.setItem(CONSENT_KEY, "declined");
        setVisible(false);
      })();
    }, 0);
  }

  return (
    <div className="consent-banner">
      <p>
        We use cookies to keep you logged in and improve your experience. See our <a href="/privacy">Privacy Policy</a> for details.
      </p>
      <div className="consent-toggles">
        <label className="consent-toggle">
          <input type="checkbox" checked disabled />
          <span>Essential (required)</span>
        </label>
        <label className="consent-toggle">
          <input type="checkbox" checked={prefs.analytics} onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })} />
          <span>Analytics</span>
        </label>
        <label className="consent-toggle">
          <input type="checkbox" checked={prefs.marketing} onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })} />
          <span>Marketing</span>
        </label>
      </div>
      <div className="consent-actions">
        <button className="btn btn-primary btn-sm" onClick={save}>Save preferences</button>
        <button className="btn btn-ghost btn-sm" onClick={acceptAll}>Accept all</button>
        <button className="btn btn-ghost btn-sm" onClick={declineAll}>Decline all</button>
      </div>
    </div>
  );
}
