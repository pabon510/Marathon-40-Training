"use client";

import type { EditFormState } from "./actions";
import { LabeledScale } from "@/components/labeled-scale";
import { EFFORT_SCALE, KNEE_SCALE } from "@/domain/content/trainingScales";

/** Post-workout fields shared by the run and strength edit forms. */
export function PostWorkoutFields({
  overallEffort,
  highestKneeDuring,
  kneeImmediatelyAfter,
  completionState,
  expectationResult,
  unusualPainFlag,
  notes,
  unusualPain,
  onUnusualPainChange,
}: {
  overallEffort: number;
  highestKneeDuring: number;
  kneeImmediatelyAfter: number;
  completionState: string;
  expectationResult: string;
  unusualPainFlag: boolean;
  notes: string;
  unusualPain: boolean;
  onUnusualPainChange: (value: boolean) => void;
}) {
  void unusualPainFlag;
  return (
    <>
      <LabeledScale label="Overall effort" name="overallEffort" min={1} max={10} labels={EFFORT_SCALE} defaultValue={overallEffort} required />
      <LabeledScale label="Highest knee discomfort during" name="highestKneeDuring" min={0} max={10} labels={KNEE_SCALE} defaultValue={highestKneeDuring} required />
      <LabeledScale label="Knee discomfort immediately after" name="kneeImmediatelyAfter" min={0} max={10} labels={KNEE_SCALE} defaultValue={kneeImmediatelyAfter} required />

      <div>
        <label htmlFor="completionState" className="field-label">
          Completion
        </label>
        <select id="completionState" name="completionState" defaultValue={completionState} className="text-input">
          <option value="full">Completed in full</option>
          <option value="partial">Partial</option>
          <option value="stopped">Stopped early</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      <div>
        <span className="field-label">Result vs expectation</span>
        <div className="mt-2 flex gap-4">
          {(["easier", "as_expected", "harder"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="radio"
                name="expectationResult"
                value={r}
                defaultChecked={expectationResult === r}
              />
              {r.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>

      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="unusualPainFlag"
          checked={unusualPain}
          onChange={(e) => onUnusualPainChange(e.target.checked)}
        />
        Unusual pain
      </label>

      <div>
        <label htmlFor="notes" className="field-label">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={2} defaultValue={notes} className="text-input" />
        <p className="field-hint">Editing only the notes will not recalculate anything.</p>
      </div>
    </>
  );
}

export function SaveResult({ state }: { state: EditFormState }) {
  if (state.error) {
    return <p className="text-sm font-medium text-safety-block">{state.error}</p>;
  }
  if (!state.saved) return null;
  return (
    <div
      className={`rounded-lg p-3 text-sm ${
        state.recalculated ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-900"
      }`}
      role="status"
    >
      {state.message}
    </div>
  );
}
