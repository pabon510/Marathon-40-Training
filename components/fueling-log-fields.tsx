export function FuelingLogFields({ includeDuringRun }: { includeDuringRun: boolean }) {
  return (
    <details className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <summary className="cursor-pointer text-sm font-bold text-emerald-950">Approximate fueling check-in (optional)</summary>
      <p className="mt-1 text-xs leading-5 text-emerald-900">Choose the closest answer. You do not need to estimate calories, carbohydrate, or protein in a meal.</p>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fuelPreIntake" className="field-label">Before workout</label>
            <select id="fuelPreIntake" name="fuelPreIntake" className="text-input" defaultValue="">
              <option value="">Not logged</option>
              <option value="meal">Meal</option>
              <option value="snack">Snack</option>
              <option value="gel">Gel</option>
              <option value="nothing">Nothing</option>
              <option value="other">Something else</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>
          <div>
            <label htmlFor="fuelPreTiming" className="field-label">How long before?</label>
            <select id="fuelPreTiming" name="fuelPreTiming" className="text-input" defaultValue="">
              <option value="">Not logged</option>
              <option value="under_30">Under 30 min</option>
              <option value="30_60">30–60 min</option>
              <option value="1_2_hours">1–2 hours</option>
              <option value="2_4_hours">2–4 hours</option>
              <option value="over_4_hours">Over 4 hours</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>
        </div>

        {includeDuringRun ? (
          <div className="rounded-lg bg-white p-3 ring-1 ring-emerald-100">
            <p className="text-sm font-semibold text-slate-900">During the run</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fuelGel100Count" className="field-label">Gel 100 (no caffeine)</label>
                <select id="fuelGel100Count" name="fuelGel100Count" className="text-input" defaultValue="0">
                  {[0, 0.5, 1, 1.5, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="fuelGel100CafCount" className="field-label">Gel 100 CAF 100</label>
                <select id="fuelGel100CafCount" name="fuelGel100CafCount" className="text-input" defaultValue="0">
                  {[0, 0.5, 1, 1.5, 2].map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
                <p className="field-hint">100 mg caffeine per whole gel</p>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="fuelFluidIntake" className="field-label">Fluids during</label>
          <select id="fuelFluidIntake" name="fuelFluidIntake" className="text-input" defaultValue="">
            <option value="">Not logged</option>
            <option value="none">None</option>
            <option value="some">Some</option>
            <option value="planned_amount">Followed a planned amount</option>
            <option value="not_sure">Not sure</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fuelPostRecovery" className="field-label">After workout</label>
            <select id="fuelPostRecovery" name="fuelPostRecovery" className="text-input" defaultValue="">
              <option value="">Not logged</option>
              <option value="shake_only">Protein shake only</option>
              <option value="shake_plus_carb">Shake + carbohydrate</option>
              <option value="meal">Balanced meal</option>
              <option value="snack">Snack</option>
              <option value="nothing_yet">Nothing yet</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div>
            <label htmlFor="fuelPostTiming" className="field-label">How soon after?</label>
            <select id="fuelPostTiming" name="fuelPostTiming" className="text-input" defaultValue="">
              <option value="">Not logged</option>
              <option value="under_30">Under 30 min</option>
              <option value="30_60">30–60 min</option>
              <option value="1_2_hours">1–2 hours</option>
              <option value="over_2_hours">Over 2 hours</option>
              <option value="not_yet">Not yet</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fuelGiResponse" className="field-label">Stomach response</label>
            <select id="fuelGiResponse" name="fuelGiResponse" className="text-input" defaultValue="">
              <option value="">Not logged</option>
              <option value="comfortable">Comfortable</option>
              <option value="mild_issue">Mild issue</option>
              <option value="significant_issue">Significant issue</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>
          <div>
            <label htmlFor="fuelEnergyResponse" className="field-label">Energy response</label>
            <select id="fuelEnergyResponse" name="fuelEnergyResponse" className="text-input" defaultValue="">
              <option value="">Not logged</option>
              <option value="steady">Stayed steady</option>
              <option value="faded">Faded</option>
              <option value="too_full">Felt too full</option>
              <option value="not_sure">Not sure</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fuelNotes" className="field-label">Fueling notes (optional)</label>
          <input id="fuelNotes" name="fuelNotes" type="text" className="text-input" placeholder="For example: banana before, gel went down well" />
        </div>
      </div>
    </details>
  );
}
