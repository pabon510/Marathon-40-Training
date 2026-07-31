"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function RunAnalysisStatus({ runLogId, sessionId }: { runLogId: string; sessionId: string }) {
  const [status, setStatus] = useState<"generating" | "ready" | "failed">("generating");
  const [message, setMessage] = useState("Evaluating this run against its prescription…");

  useEffect(() => {
    let active = true;
    void fetch("/api/run-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runLogId }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? "Analysis failed.");
        if (active) setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus("failed");
        setMessage(error instanceof Error ? error.message : "Analysis can be retried from history.");
      });
    return () => { active = false; };
  }, [runLogId]);

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
      <p className="text-sm font-semibold text-brand-950">
        {status === "generating" ? "Creating your run review" : status === "ready" ? "Your run review is ready" : "Run review needs a retry"}
      </p>
      {status !== "ready" ? <p className="mt-1 text-xs text-brand-900">{message}</p> : null}
      <Link href={`/history/${sessionId}/analysis`} className="mt-2 inline-flex text-sm font-semibold text-brand-700 underline">
        {status === "ready" ? "View run review" : "Open analysis status"}
      </Link>
    </div>
  );
}
