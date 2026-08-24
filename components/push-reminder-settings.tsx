"use client";

import { useEffect, useState } from "react";
import type { PushReminderPreferences } from "@/domain/reminders/preferences";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(base64);
  return Uint8Array.from([...bytes].map((character) => character.charCodeAt(0)));
}

function deviceLabel() {
  const agent = navigator.userAgent;
  if (/iPhone/i.test(agent)) return "iPhone";
  if (/iPad/i.test(agent)) return "iPad";
  if (/Macintosh/i.test(agent)) return "Mac";
  return "Browser";
}

export function PushReminderSettings({
  publicKey,
  initialPreferences,
}: {
  publicKey: string;
  initialPreferences: PushReminderPreferences;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!available) {
      Promise.resolve().then(() => setSupported(false));
      return;
    }
    navigator.serviceWorker.register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setSupported(true);
        setSubscribed(Boolean(subscription));
      })
      .catch(() => setMessage("This browser could not prepare push notifications."));
  }, []);

  function toggle(key: keyof PushReminderPreferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    setMessage(null);
  }

  async function enableOrSave() {
    setPending(true);
    setMessage(null);
    try {
      if (!publicKey) throw new Error("Push notifications are not configured on the server yet.");
      const registration = await navigator.serviceWorker.ready;
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), preferences, deviceLabel: deviceLabel() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save notifications.");
      setSubscribed(true);
      setMessage("Push reminders are on for this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable push reminders.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not disable notifications.");
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setPreferences({ dailyCheckIn: false, weeklyPlanning: false, unloggedWorkout: false });
      setMessage("Push reminders are off.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disable notifications.");
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setPending(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("Enable push reminders before sending a test.");
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The test could not be sent.");
      setMessage("Test sent. It should appear within a few seconds.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The test could not be sent.");
    } finally {
      setPending(false);
    }
  }

  if (supported === false) {
    return (
      <section className="card">
        <h2 className="font-bold text-slate-950">Push reminders</h2>
        <p className="mt-2 text-sm text-slate-600">
          Push is not available in this browser. On iPhone, add the app to your Home Screen, open that installed app, then return here.
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-950">Push reminders</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${subscribed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
            {subscribed ? "On" : "Off"}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          On iPhone, notifications require the installed Home Screen app. Times use your America/New_York profile timezone.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex min-h-touch items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={preferences.dailyCheckIn} onChange={() => toggle("dailyCheckIn")} />
          <span><strong className="block text-sm text-slate-900">Daily check-in · around 5:00 a.m.</strong><span className="text-xs text-slate-600">Includes rest days so knee and recovery trends stay complete.</span></span>
        </label>
        <label className="flex min-h-touch items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={preferences.weeklyPlanning} onChange={() => toggle("weeklyPlanning")} />
          <span><strong className="block text-sm text-slate-900">Plan next week · Sunday around 8:00 p.m.</strong><span className="text-xs text-slate-600">Skipped automatically when next week is already planned.</span></span>
        </label>
        <label className="flex min-h-touch items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={preferences.unloggedWorkout} onChange={() => toggle("unloggedWorkout")} />
          <span><strong className="block text-sm text-slate-900">Unlogged workout reminder</strong><span className="text-xs text-slate-600">Weekdays around 10:00 a.m.; weekends around 8:00 p.m.</span></span>
        </label>
      </div>

      {message ? <p role="status" className="text-sm font-medium text-slate-700">{message}</p> : null}
      <button type="button" className="btn-primary w-full" onClick={enableOrSave} disabled={pending || supported === null}>
        {pending ? "Saving…" : subscribed ? "Save reminder choices" : "Enable push reminders"}
      </button>
      {subscribed ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-secondary w-full" onClick={sendTest} disabled={pending}>Send a test</button>
          <button type="button" className="btn-secondary w-full" onClick={disable} disabled={pending}>Turn off on this device</button>
        </div>
      ) : null}
    </section>
  );
}
