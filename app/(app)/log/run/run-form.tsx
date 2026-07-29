"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { RedFlagWarning } from "@/components/red-flag-warning";
import { logRunAction, type LogRunFormState } from "./actions";

const initialState: LogRunFormState = {};

export function RunLogForm() {
  const [state, formAction, pending] = useActionState(logRunAction, initialState);
  const [isOverride, setIsOverride] = useState(false);
  const [unusualPain, setUnusualPain] = useState(false);

  if (state.success) {
    return (
      <div className="card space-y-2">
        <p className="text-sm font-semibold text-safety-ok">Run logged.</p>
        {state.tomorrowPreview ? <p className="text-sm text-slate-600">{state.tomorrowPreview}</p> : null}
        <Link href="/history" className="text-sm text-brand-700 underline">
          View or correct it in history
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <span className="field-label">Type</span>
        <div className="mt-2 flex gap-4">
          {(["outdoor", "treadmill", "run_walk"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm capitalize">
              <input type="radio" name="runType" value={t} defaultChecked={t === "outdoor"} />
              {t.replace("_", "-")}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="distanceMiles" className="field-label">
            Distance (miles)
          </label>
          <input id="distanceMiles" name="distanceMiles" type="number" step="0.01" inputMode="decimal" className="text-input" />
        </div>
        <div>
          <label htmlFor="durationMinutes" className="field-label">
            Duration (minutes)
          </label>
          <input id="durationMinutes" name="durationMinutes" type="number" inputMode="numeric" className="text-input" />
        </div>
      </div>

      <div>
        <label htmlFor="paceOverrideMinutes" className="field-label">
          Pace override (min/mile, optional)
        </label>
        <input
          id="paceOverrideMinutes"
          name="paceOverrideMinutes"
          type="number"
          step="0.01"
          inputMode="decimal"
          className="text-input"
        />
        <p className="field-hint">Pace is otherwise calculated automatically from distance/duration.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="averageHr" className="field-label">
            Average HR
          </label>
          <input id="averageHr" name="averageHr" type="number" inputMode="numeric" className="text-input" />
        </div>
        <div>
          <label htmlFor="maximumHr" className="field-label">
            Max HR
          </label>
          <input id="maximumHr" name="maximumHr" type="number" inputMode="numeric" className="text-input" />
        </div>
      </div>

      <div>
        <label htmlFor="elevationGainFeet" className="field-label">
          Elevation gain (feet, optional)
        </label>
        <input id="elevationGainFeet" name="elevationGainFeet" type="number" inputMode="numeric" className="text-input" />
      </div>

      <div>
        <label htmlFor="effort" className="field-label">
          Overall effort (1 extremely easy — 10 maximal)
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
        Unusual pain (not the usual knee-discomfort tracking)
      </label>
      {unusualPain ? <RedFlagWarning /> : null}

      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input type="checkbox" name="unplanned" />
        This is unplanned / extra (not today&apos;s scheduled workout)
      </label>

      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input type="checkbox" checked={isOverride} onChange={(e) => setIsOverride(e.target.checked)} name="isOverride" />
        I did something different than recommended
      </label>
      {isOverride ? (
        <div>
          <label htmlFor="overrideReason" className="field-label">
            Reason
          </label>
          <input id="overrideReason" name="overrideReason" type="text" required className="text-input" />
        </div>
      ) : null}

      <div>
        <label htmlFor="notes" className="field-label">
          Notes (optional)
        </label>
        <textarea id="notes" name="notes" rows={2} className="text-input" />
      </div>

      {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save run + post-workout check-in"}
      </button>
    </form>
  );
}
