"use client";

import { useEffect, useState } from "react";

/** This app is online-only (no offline mode). Surfaces a clear, non-blocking notice when the network drops. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div role="status" className="bg-safety-warn px-4 py-2 text-center text-sm font-medium text-white">
      You&apos;re offline. This app requires an internet connection — reconnect to continue.
    </div>
  );
}
