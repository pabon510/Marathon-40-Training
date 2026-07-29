"use client";

import { useActionState, useState } from "react";
import type { SessionDetail } from "@/lib/services/historyService";
import { RedFlagWarning } from "@/components/red-flag-warning";
import { saveRunEdit, type EditFormState } from "./actions";
import { PostWorkoutFields, SaveResult } from "./edit-shared";

const initialState: EditFormState = {};

export function RunEditForm({ detail }: { detail: SessionDetail }) {
  const [state, formAction, pending] = useActionState(saveRunEdit, initialState);
  const [unusualPain, setUnusualPain] = useState(detail.session.unusual_pain_flag);

  const run = detail.runLog;
  const check = detail.postCheckIn;

  return (
    <form action={formAction} className="card space-y-4">
      <input type="hidden" name="sessionId" value={detail.session.id} />

      <div>
        <span className="field-label">Type</span>
        <div className="mt-2 flex gap-4">
          {(["outdoor", "treadmill", "run_walk"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm capitalize">
              <input type="radio" name="runType" value={t} defaultChecked={(run?.run_type ?? "outdoor") === t} />
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
          <input
            id="distanceMiles"
            name="distanceMiles"
            type="number"
            step="0.01"
            inputMode="decimal"
            defaultValue={run?.distance_miles ?? ""}
            className="text-input"
          />
        </div>
        <div>
          <label htmlFor="durationMinutes" className="field-label">
            Duration (minutes)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            step="0.1"
            inputMode="decimal"
            defaultValue={run?.duration_seconds !== null && run?.duration_seconds !== undefined ? run.duration_seconds / 60 : ""}
            className="text-input"
          />
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
          defaultValue={
            run?.pace_override_seconds_per_mile !== null && run?.pace_override_seconds_per_mile !== undefined
              ? run.pace_override_seconds_per_mile / 60
              : ""
          }
          className="text-input"
        />
        <p className="field-hint">Leave blank to keep using the pace calculated from distance and duration.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="averageHr" className="field-label">
            Average HR
          </label>
          <input
            id="averageHr"
            name="averageHr"
            type="number"
            inputMode="numeric"
            defaultValue={run?.average_hr ?? ""}
            className="text-input"
          />
        </div>
        <div>
          <label htmlFor="maximumHr" className="field-label">
            Max HR
          </label>
          <input
            id="maximumHr"
            name="maximumHr"
            type="number"
            inputMode="numeric"
            defaultValue={run?.maximum_hr ?? ""}
            className="text-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="elevationGainFeet" className="field-label">
          Elevation gain (feet, optional)
        </label>
        <input
          id="elevationGainFeet"
          name="elevationGainFeet"
          type="number"
          inputMode="numeric"
          defaultValue={run?.elevation_gain_feet ?? ""}
          className="text-input"
        />
      </div>

      <PostWorkoutFields
        overallEffort={check?.overall_effort ?? detail.session.overall_effort ?? run?.effort ?? 5}
        highestKneeDuring={check?.highest_knee_during ?? run?.highest_knee_during ?? 0}
        kneeImmediatelyAfter={check?.knee_immediately_after ?? run?.knee_immediately_after ?? 0}
        completionState={detail.session.completion_state}
        expectationResult={check?.expectation_result ?? detail.session.expectation_result ?? "as_expected"}
        unusualPainFlag={detail.session.unusual_pain_flag}
        notes={detail.session.notes ?? ""}
        unusualPain={unusualPain}
        onUnusualPainChange={setUnusualPain}
      />
      {unusualPain ? <RedFlagWarning /> : null}

      <SaveResult state={state} />

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
