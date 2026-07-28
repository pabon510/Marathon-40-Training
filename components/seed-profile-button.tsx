"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * One-time setup control shown when no profile exists yet. Calls the
 * session-gated POST /api/admin/seed route, which upserts the exercise
 * library and creates this account's profile (never overwriting one that
 * already exists), then refreshes the page. No terminal access needed.
 */
export function SeedProfileButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Setup failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card">
      <p className="text-sm text-slate-600">
        No profile found yet for this account. Set up the exercise library and your starting profile now — this
        only needs to run once.
      </p>
      <button type="button" onClick={handleClick} disabled={pending} className="btn-primary mt-3 w-full">
        {pending ? "Setting up…" : "Set up profile"}
      </button>
      {error ? <p className="mt-2 text-sm font-medium text-safety-block">{error}</p> : null}
    </div>
  );
}
