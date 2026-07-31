"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryAnalysis({ runLogId }: { runLogId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function retry() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/run-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runLogId, force: true }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Analysis could not be generated.");
    } else {
      router.refresh();
    }
    setPending(false);
  }
  return (
    <div>
      {error ? <p className="mb-2 text-sm text-safety-block">{error}</p> : null}
      <button type="button" onClick={retry} disabled={pending} className="btn-secondary w-full">
        {pending ? "Analyzing…" : "Generate run review"}
      </button>
    </div>
  );
}
