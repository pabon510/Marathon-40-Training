"use client";

import { useState } from "react";
import type { WeeklyReviewResult } from "@/domain/analysis/weeklyReview";

export function WeeklyCoachingCard({ weekStart, initialResult, isCurrentWeek }: { weekStart: string; initialResult: WeeklyReviewResult | null; isCurrentWeek: boolean }) {
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function generate(force = false) {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/weekly-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart, force }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The recap could not be generated.");
      setResult(payload.review.structured_result as WeeklyReviewResult);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The recap could not be generated."); }
    finally { setLoading(false); }
  }
  return (
    <section className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Weekly coaching recap</p><h2 className="mt-1 text-xl font-bold text-slate-950">{result?.headline ?? "Turn this week into a clear takeaway"}</h2></div>
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-800">{isCurrentWeek ? "In progress" : "Complete"}</span>
      </div>
      {!result ? <p className="mt-3 text-sm leading-6 text-slate-600">Review consistency, running, strength, knee response, and the single most useful focus for next week.</p> : <>
        <p className="mt-3 text-sm leading-6 text-slate-700">{result.summary}</p>
        {result.wins.length ? <div className="mt-4"><h3 className="text-sm font-bold text-slate-950">What moved forward</h3><ul className="mt-2 space-y-2">{result.wins.map((item, i) => <li key={i} className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">✓ {item.text}</li>)}</ul></div> : null}
        {result.patterns.length ? <div className="mt-4"><h3 className="text-sm font-bold text-slate-950">Patterns worth noticing</h3><ul className="mt-2 space-y-2">{result.patterns.map((item, i) => <li key={i} className="rounded-xl bg-white/80 p-3 text-sm text-slate-700">{item.text}</li>)}</ul></div> : null}
        <div className="mt-4 rounded-2xl bg-violet-700 p-4 text-white"><p className="text-[11px] font-bold uppercase tracking-wider text-violet-100">One focus</p><p className="mt-1 text-sm font-semibold leading-5">{result.nextWeekFocus.text}</p></div>
        {result.dataQualityNote ? <p className="mt-3 text-xs text-slate-500">{result.dataQualityNote}</p> : null}
      </>}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button type="button" onClick={() => generate(Boolean(result))} disabled={loading} className="btn-secondary mt-4 w-full">{loading ? "Reviewing your week…" : result ? "Refresh recap" : "Create weekly recap"}</button>
      <p className="mt-2 text-center text-[11px] text-slate-500">The recap explains your data. It cannot change your plan or safety rules.</p>
    </section>
  );
}
