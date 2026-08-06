import type { WorkoutFuelingLogRow } from "@/lib/supabase/types";

const LABELS: Record<string, string> = {
  meal: "Meal",
  snack: "Snack",
  gel: "Gel",
  nothing: "Nothing",
  other: "Something else",
  not_sure: "Not sure",
  under_30: "Under 30 minutes",
  "30_60": "30–60 minutes",
  "1_2_hours": "1–2 hours",
  "2_4_hours": "2–4 hours",
  over_4_hours: "Over 4 hours",
  none: "None",
  some: "Some",
  planned_amount: "Followed planned amount",
  shake_only: "Protein shake only",
  shake_plus_carb: "Protein shake + carbohydrate",
  nothing_yet: "Nothing yet",
  over_2_hours: "Over 2 hours",
  not_yet: "Not yet",
  comfortable: "Comfortable",
  mild_issue: "Mild issue",
  significant_issue: "Significant issue",
  steady: "Stayed steady",
  faded: "Faded",
  too_full: "Felt too full",
};

function label(value: string | null) {
  return value ? (LABELS[value] ?? value.replaceAll("_", " ")) : "Not logged";
}

export function FuelingLogSummary({ log }: { log: WorkoutFuelingLogRow }) {
  return (
    <section className="card border-emerald-200 bg-emerald-50/60">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Fueling recap</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-slate-500">Before</p><p className="font-semibold text-slate-900">{label(log.pre_intake)}</p><p className="text-xs text-slate-600">{label(log.pre_timing)}</p></div>
        <div><p className="text-xs text-slate-500">After</p><p className="font-semibold text-slate-900">{label(log.post_recovery)}</p><p className="text-xs text-slate-600">{label(log.post_timing)}</p></div>
        <div><p className="text-xs text-slate-500">Maurten gels</p><p className="font-semibold text-slate-900">{log.gel_100_count} Gel 100 · {log.gel_100_caf_count} CAF 100</p></div>
        <div><p className="text-xs text-slate-500">Response</p><p className="font-semibold text-slate-900">{label(log.energy_response)}</p><p className="text-xs text-slate-600">Stomach: {label(log.gi_response)}</p></div>
      </div>
      {log.notes ? <p className="mt-3 text-sm text-slate-700">{log.notes}</p> : null}
    </section>
  );
}
