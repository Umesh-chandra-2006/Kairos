import { useCallback, useEffect, useState } from "react";
import { api, urlBase64ToUint8Array } from "../api/client";
import { ErrorBanner } from "./forms";

type Status = "loading" | "unsupported" | "unconfigured" | "idle" | "subscribed" | "denied" | "error";

interface PushSubscriptionLike {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function WebPushCard() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    try {
      const { publicKey } = await api.vapidPublicKey();
      if (!publicKey) {
        setStatus("unconfigured");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const existing = registration ? await registration.pushManager.getSubscription() : null;
      setStatus(existing ? "subscribed" : "idle");
    } catch {
      setStatus("error");
      setError("Could not check your notification subscription.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const { publicKey } = await api.vapidPublicKey();
      if (!publicKey) throw new Error("Push notifications are not configured on the server.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })) as unknown as PushSubscriptionLike;
      await api.subscribePush({ token: subscription.endpoint, keys: subscription.keys });
      setStatus("subscribed");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setStatus("denied");
        setError("Permission was denied. Enable notifications for Kairos in your browser settings.");
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not enable push notifications.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!registration) return;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable push notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;
  if (status === "unsupported") return null;

  return (
    <div className="card">
      <h2 className="card-title">Browser notifications</h2>
      {status === "unconfigured" ? (
        <p className="muted">Browser push is not enabled on the server yet.</p>
      ) : status === "denied" ? (
        <>
          <p className="muted">Notifications are blocked. Allow them in your browser's site settings, then try again.</p>
          <button className="btn btn-primary" onClick={() => void enable()} disabled={busy}>
            Try again
          </button>
        </>
      ) : (
        <>
          <ErrorBanner message={error} />
          <p className="muted">
            {status === "subscribed"
              ? "You're subscribed to browser notifications."
              : "Get a reminder to answer your daily question, right in the browser."}
          </p>
          {status === "subscribed" ? (
            <button className="btn btn-ghost" onClick={() => void disable()} disabled={busy}>
              {busy ? "Disabling…" : "Turn off"}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => void enable()} disabled={busy}>
              {busy ? "Enabling…" : "Enable browser notifications"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
