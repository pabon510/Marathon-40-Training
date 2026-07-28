"use client";

import { useActionState } from "react";
import type { ProfileRow } from "@/lib/supabase/types";
import { saveSettings, type SettingsFormState } from "./actions";

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const initialState: SettingsFormState = {};

export function SettingsForm({ profile }: { profile: ProfileRow }) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);
  const equipment = profile.equipment as {
    home?: { dumbbellsLb?: number[]; bands?: boolean; bench?: boolean; adjustableKettlebellLb?: number[] };
  };

  return (
    <form action={formAction} className="card space-y-5">
      <div>
        <label htmlFor="targetMarathonDate" className="field-label">
          Target marathon date (optional)
        </label>
        <input
          id="targetMarathonDate"
          name="targetMarathonDate"
          type="date"
          defaultValue={profile.target_marathon_date ?? ""}
          className="text-input"
        />
        <p className="field-hint">
          Training is currently in the base-rebuilding phase regardless of this date.
        </p>
      </div>

      <fieldset>
        <legend className="field-label">Default available weekdays</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEEKDAYS.map((day) => (
            <label key={day} className="flex min-h-touch items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                name="availableWeekdays"
                value={day}
                defaultChecked={profile.default_available_weekdays.includes(day)}
                className="h-5 w-5 rounded border-slate-300 text-brand-600"
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="field-label">Preferred long-run day</span>
        <div className="mt-2 flex gap-4">
          {(["saturday", "sunday"] as const).map((day) => (
            <label key={day} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="radio"
                name="preferredLongRunDay"
                value={day}
                defaultChecked={profile.preferred_long_run_day === day}
              />
              {day}
            </label>
          ))}
        </div>
        <p className="field-hint">The other weekend day is the automatic backup.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="easyHrFloor" className="field-label">
            Easy-run HR floor
          </label>
          <input
            id="easyHrFloor"
            name="easyHrFloor"
            type="number"
            inputMode="numeric"
            defaultValue={profile.easy_hr_floor}
            className="text-input"
          />
        </div>
        <div>
          <label htmlFor="easyHrCeiling" className="field-label">
            Easy-run HR ceiling
          </label>
          <input
            id="easyHrCeiling"
            name="easyHrCeiling"
            type="number"
            inputMode="numeric"
            defaultValue={profile.easy_hr_ceiling}
            className="text-input"
          />
        </div>
      </div>
      <p className="field-hint">
        Provisional — based on Garmin zones and wrist optical HR. Change only after a deliberate review, not
        day-to-day.
      </p>

      <fieldset className="space-y-2">
        <legend className="field-label">Home equipment</legend>
        <div>
          <label htmlFor="homeDumbbells" className="text-sm text-slate-700">
            Dumbbells (lb, comma-separated)
          </label>
          <input
            id="homeDumbbells"
            name="homeDumbbells"
            type="text"
            defaultValue={(equipment.home?.dumbbellsLb ?? [15, 25]).join(", ")}
            className="text-input"
          />
        </div>
        <div>
          <label htmlFor="homeKettlebell" className="text-sm text-slate-700">
            Adjustable kettlebell (lb, comma-separated)
          </label>
          <input
            id="homeKettlebell"
            name="homeKettlebell"
            type="text"
            defaultValue={(equipment.home?.adjustableKettlebellLb ?? [15, 25, 35, 45]).join(", ")}
            className="text-input"
          />
        </div>
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input type="checkbox" name="homeBands" defaultChecked={equipment.home?.bands ?? true} />
          Resistance bands
        </label>
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input type="checkbox" name="homeBench" defaultChecked={equipment.home?.bench ?? true} />
          Bench
        </label>
      </fieldset>

      {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-medium text-safety-ok">Settings saved.</p> : null}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
