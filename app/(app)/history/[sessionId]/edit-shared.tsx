"use client";

import type { EditFormState } from "./actions";

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
      <div>
        <label htmlFor="overallEffort" className="field-label">
          Overall effort (1-10)
        </label>
        <input
          id="overallEffort"
          name="overallEffort"
          type="range"
          min={1}
          max={10}
          defaultValue={overallEffort}
          className="mt-2 h-11 w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="highestKneeDuring" className="field-label">
            Highest knee during (0-10)
          </label>
          <input
            id="highestKneeDuring"
            name="highestKneeDuring"
            type="range"
            min={0}
            max={10}
            defaultValue={highestKneeDuring}
            className="mt-2 h-11 w-full"
          />
        </div>
        <div>
          <label htmlFor="kneeImmediatelyAfter" className="field-label">
            Knee immediately after (0-10)
          </label>
          <input
            id="kneeImmediatelyAfter"
            name="kneeImmediatelyAfter"
            type="range"
            min={0}
            max={10}
            defaultValue={kneeImmediatelyAfter}
            className="mt-2 h-11 w-full"
          />
        </div>
      </div>

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
