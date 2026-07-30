import type { StrengthWarmup } from "@/domain/content/strengthWarmups";

export function StrengthWarmupCard({ warmup }: { warmup: StrengthWarmup }) {
  return (
    <section className="card border-amber-200 bg-amber-50/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">Warmup</p>
          <p className="text-xs text-slate-600">Prepare to move well before the working sets.</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-900">
          {warmup.durationMinutes} min
        </span>
      </div>
      <ol className="mt-3 space-y-2">
        {warmup.steps.map((step, index) => (
          <li key={step.name} className="flex gap-2 text-sm">
            <span className="font-bold text-amber-800">{index + 1}.</span>
            <span><strong>{step.name}</strong><span className="block text-xs text-slate-600">{step.guidance}</span></span>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-lg bg-white p-2 text-xs text-slate-700">{warmup.rampUpGuidance}</p>
      <p className="mt-2 text-xs font-medium text-slate-600">
        Warmup and ramp-up sets are not working sets and do not affect strength progression.
      </p>
    </section>
  );
}
