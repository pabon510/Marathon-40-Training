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
  const displayedWeight = profile.body_weight_kg === null
    ? ""
    : profile.preferred_weight_unit === "lb"
      ? (profile.body_weight_kg * 2.2046226218).toFixed(1)
      : profile.body_weight_kg.toFixed(1);

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

      <fieldset className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <legend className="px-1 text-sm font-bold text-emerald-950">Workout fueling profile</legend>
        <p className="text-xs leading-5 text-emerald-900">
          Used only to tailor workout fueling. Weight is not shown as a progress metric. The app uses approximate
          foods and servings rather than requiring calorie or macro tracking.
        </p>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div>
            <label htmlFor="bodyWeight" className="field-label">Current weight (optional)</label>
            <input id="bodyWeight" name="bodyWeight" type="number" inputMode="decimal" step="0.1" className="text-input" defaultValue={displayedWeight} />
          </div>
          <div>
            <label htmlFor="preferredWeightUnit" className="field-label">Unit</label>
            <select id="preferredWeightUnit" name="preferredWeightUnit" className="text-input" defaultValue={profile.preferred_weight_unit}>
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="typicalDailyCaffeineMg" className="field-label">Typical daily caffeine (mg, optional)</label>
          <input id="typicalDailyCaffeineMg" name="typicalDailyCaffeineMg" type="number" min="0" max="1000" step="25" inputMode="numeric" className="text-input" defaultValue={profile.typical_daily_caffeine_mg ?? ""} />
          <p className="field-hint">One Maurten Gel 100 CAF 100 contains 100 mg. Include coffee, tea, and other sources in your estimate.</p>
        </div>
        <div>
          <label htmlFor="caffeineSensitivity" className="field-label">Caffeine sensitivity</label>
          <select id="caffeineSensitivity" name="caffeineSensitivity" className="text-input" defaultValue={profile.caffeine_sensitivity}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="avoid">Avoid caffeine</option>
          </select>
        </div>
        <div>
          <label htmlFor="caffeineCutoffHour" className="field-label">Latest comfortable caffeine hour (optional)</label>
          <select id="caffeineCutoffHour" name="caffeineCutoffHour" className="text-input" defaultValue={profile.caffeine_cutoff_hour ?? ""}>
            <option value="">Not set</option>
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>{new Date(2020, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric" })}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dietaryRestrictions" className="field-label">Dietary restrictions or allergies (optional)</label>
          <input id="dietaryRestrictions" name="dietaryRestrictions" type="text" className="text-input" defaultValue={profile.dietary_restrictions.join(", ")} placeholder="Comma-separated" />
        </div>
        <div>
          <label htmlFor="lactoseTolerant" className="field-label">Milk-based shake tolerance</label>
          <select id="lactoseTolerant" name="lactoseTolerant" className="text-input" defaultValue={profile.lactose_tolerant === true ? "yes" : profile.lactose_tolerant === false ? "no" : "unknown"}>
            <option value="unknown">Not sure</option>
            <option value="yes">Tolerates it</option>
            <option value="no">Does not tolerate it</option>
          </select>
        </div>
      </fieldset>

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
