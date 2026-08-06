import type { FuelingPlan } from "@/domain/fueling/fuelingPlan";

export function FuelingPlanCard({ plan }: { plan: FuelingPlan }) {
  if (!plan.applies) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-600 text-white shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Fuel this workout</p>
            <h2 className="mt-1 text-lg font-bold">Simple before · during · after plan</h2>
          </div>
          <span className="text-2xl" aria-hidden="true">⚡</span>
        </div>

        <div className="mt-4 space-y-3">
          {[
            ["Before", plan.before],
            ["During", plan.during],
            ["After", plan.after],
          ].map(([label, text]) => (
            <div key={label} className="rounded-xl bg-white/10 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">{label}</p>
              <p className="mt-1 text-sm leading-6 text-white/90">{text}</p>
            </div>
          ))}
        </div>

        {plan.productPlan.gel100Count > 0 ? (
          <div className="mt-3 rounded-xl bg-white p-3 text-slate-900">
            <p className="text-sm font-bold">Your available run fuel</p>
            <p className="mt-1 text-sm">
              Maurten Gel 100: {plan.productPlan.gel100Count} planned · 25 g carbohydrate each · no caffeine
            </p>
            <p className="mt-1 text-xs text-slate-600">Timing: {plan.productPlan.gelTiming}</p>
          </div>
        ) : null}

        {plan.productPlan.shakeRecommended ? (
          <div className="mt-3 rounded-xl bg-white p-3 text-slate-900">
            <p className="text-sm font-bold">Your available recovery shake</p>
            <p className="mt-1 text-sm">1 bottle = 30 g protein + 5 g carbohydrate.</p>
            {plan.productPlan.shakeNeedsCarbohydratePairing ? (
              <p className="mt-1 text-xs text-slate-600">Pair it with a carbohydrate food or meal when recommended above.</p>
            ) : null}
          </div>
        ) : null}

        {plan.cautions.length > 0 ? (
          <details className="mt-3 rounded-xl bg-amber-100 p-3 text-amber-950">
            <summary className="cursor-pointer text-sm font-bold">Caffeine and tolerance notes</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
              {plan.cautions.map((caution) => <li key={caution}>{caution}</li>)}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}
