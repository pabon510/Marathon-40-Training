"use client";

import { useActionState, useState } from "react";
import type { ResolvedExerciseItem } from "@/lib/services/workoutContentService";
import { RedFlagWarning } from "@/components/red-flag-warning";
import { logStrengthAction, type LogStrengthFormState } from "./actions";

const initialState: LogStrengthFormState = {};

export function StrengthLogForm({
  items,
  defaultLocation,
}: {
  items: ResolvedExerciseItem[];
  defaultLocation: "gym" | "home";
}) {
  const [state, formAction, pending] = useActionState(logStrengthAction, initialState);
  const [unusualPain, setUnusualPain] = useState(false);

  if (state.success) {
    return (
      <div className="card">
        <p className="text-sm font-semibold text-safety-ok">Strength workout logged.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="location" value={defaultLocation} />

      {items.map((item, i) => (
        <div key={item.ordinal} className="card space-y-2">
          <input type="hidden" name="exerciseId" value={item.exercise.id} />
          <input type="hidden" name={`variantId_${i}`} value={item.variant.id} />
          <p className="text-sm font-semibold text-slate-900">{item.exercise.name}</p>
          <p className="text-xs text-slate-500">
            Prescribed {item.setCount} x {item.repRangeLow}-{item.repRangeHigh}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="field-label" htmlFor={`sets_${i}`}>
                Sets
              </label>
              <input id={`sets_${i}`} name={`sets_${i}`} type="number" inputMode="numeric" defaultValue={item.setCount} className="text-input" />
            </div>
            <div>
              <label className="field-label" htmlFor={`reps_${i}`}>
                Reps
              </label>
              <input
                id={`reps_${i}`}
                name={`reps_${i}`}
                type="number"
                inputMode="numeric"
                defaultValue={item.repRangeLow}
                className="text-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor={`load_${i}`}>
                Load
              </label>
              <input id={`load_${i}`} name={`load_${i}`} type="number" inputMode="decimal" className="text-input" />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor={`loadUnit_${i}`}>
              Unit
            </label>
            <select id={`loadUnit_${i}`} name={`loadUnit_${i}`} defaultValue="lb" className="text-input">
              <option value="lb">lb</option>
              <option value="kg">kg</option>
              <option value="bodyweight">bodyweight</option>
              <option value="band">band</option>
              <option value="n/a">n/a</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor={`difficulty_${i}`}>
              Difficulty (1-10)
            </label>
            <input
              id={`difficulty_${i}`}
              name={`difficulty_${i}`}
              type="range"
              min={1}
              max={10}
              defaultValue={6}
              className="mt-2 h-11 w-full"
            />
          </div>
        </div>
      ))}

      <div className="card space-y-4">
        <p className="text-sm font-semibold text-slate-900">Post-workout check-in</p>
        <div>
          <label htmlFor="effort" className="field-label">
            Overall effort (1-10)
          </label>
          <input id="effort" name="effort" type="range" min={1} max={10} defaultValue={5} className="mt-2 h-11 w-full" />
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
              defaultValue={0}
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
              defaultValue={0}
              className="mt-2 h-11 w-full"
            />
          </div>
        </div>
        <div>
          <span className="field-label">Result vs expectation</span>
          <div className="mt-2 flex gap-4">
            {(["easier", "as_expected", "harder"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm capitalize">
                <input type="radio" name="expectationResult" value={r} defaultChecked={r === "as_expected"} />
                {r.replace("_", " ")}
              </label>
            ))}
          </div>
        </div>
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input type="checkbox" name="completedFull" defaultChecked />
          Completed in full (uncheck if partial/stopped)
        </label>
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="unusualPainFlag"
            checked={unusualPain}
            onChange={(e) => setUnusualPain(e.target.checked)}
          />
          Unusual pain
        </label>
        {unusualPain ? <RedFlagWarning /> : null}
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input type="checkbox" name="unplanned" />
          This is unplanned / extra
        </label>
        <div>
          <label htmlFor="notes" className="field-label">
            Notes (optional)
          </label>
          <textarea id="notes" name="notes" rows={2} className="text-input" />
        </div>

        {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Saving…" : "Save strength workout"}
        </button>
      </div>
    </form>
  );
}
