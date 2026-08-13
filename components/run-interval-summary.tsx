import type { RunIntervalStepRow } from "@/lib/supabase/types";
import { formatSecondsAsClock } from "@/domain/import/garminForm";

export function RunIntervalSummary({ steps }: { steps: RunIntervalStepRow[] }) {
  if (steps.length === 0) return null;
  const included = steps.filter((step) => step.included);

  return (
    <section className="card">
      <h2 className="font-semibold text-slate-900">Structured intervals</h2>
      <p className="mt-1 text-sm text-slate-600">
        {included.filter((step) => step.step_type === "work").length} work intervals included in analysis
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="pb-2">Step</th><th className="pb-2">Time</th><th className="pb-2">Distance</th><th className="pb-2">Pace</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {steps.map((step) => (
              <tr key={step.id} className={step.included ? "" : "text-slate-400 line-through"}>
                <td className="py-2 font-medium capitalize">
                  {step.step_type === "work" && step.repetition_number ? `Work ${step.repetition_number}` : step.step_type}
                  {!step.included ? " (excluded)" : ""}
                </td>
                <td className="py-2">{formatSecondsAsClock(step.duration_seconds) || "—"}</td>
                <td className="py-2">{step.distance_miles === null ? "—" : `${step.distance_miles} mi`}</td>
                <td className="py-2">{formatSecondsAsClock(step.average_pace_seconds_per_mile) ? `${formatSecondsAsClock(step.average_pace_seconds_per_mile)}/mi` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
