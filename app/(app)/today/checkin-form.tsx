"use client";

import { useActionState, useState } from "react";
import { submitCheckInAction, type CheckInFormState } from "./actions";

const SCALE_FIELDS = [
  { name: "energy", label: "Energy", hint: "1 depleted · 2 low · 3 normal · 4 good · 5 excellent" },
  { name: "soreness", label: "Soreness", hint: "1 none · 2 mild · 3 noticeable · 4 high · 5 severe" },
  { name: "stress", label: "Stress", hint: "1 very low · 5 overwhelming" },
  { name: "fatigue", label: "Fatigue", hint: "1 fresh · 2 slightly tired · 3 normal · 4 very tired · 5 exhausted" },
] as const;

const initialState: CheckInFormState = {};

export function CheckInForm({ needsLocation }: { needsLocation: boolean }) {
  const [state, formAction, pending] = useActionState(submitCheckInAction, initialState);
  const [kneeSkip, setKneeSkip] = useState(false);
  const [sleepSkip, setSleepSkip] = useState(false);
  const [fieldSkips, setFieldSkips] = useState<Record<string, boolean>>({});

  return (
    <form action={formAction} className="card space-y-5">
      <h2 className="text-base font-bold text-slate-900">Morning check-in</h2>

      <div>
        <label htmlFor="hoursSlept" className="field-label">
          Hours slept
        </label>
        <input
          id="hoursSlept"
          name="hoursSlept"
          type="number"
          step="0.25"
          inputMode="decimal"
          disabled={sleepSkip}
          className="text-input"
        />
        <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            name="hoursSleptSkip"
            checked={sleepSkip}
            onChange={(e) => setSleepSkip(e.target.checked)}
          />
          Skip (I don&apos;t know)
        </label>
      </div>

      <div>
        <label htmlFor="ouraScore" className="field-label">
          Oura Sleep Score (optional)
        </label>
        <input
          id="ouraScore"
          name="ouraScore"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          className="text-input"
        />
      </div>

      {SCALE_FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="field-label">
            {field.label}
          </label>
          <p className="field-hint">{field.hint}</p>
          <input
            id={field.name}
            name={field.name}
            type="range"
            min={1}
            max={5}
            step={1}
            defaultValue={3}
            disabled={fieldSkips[field.name]}
            className="mt-2 h-11 w-full"
          />
          <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              name={`${field.name}Skip`}
              checked={fieldSkips[field.name] ?? false}
              onChange={(e) => setFieldSkips((s) => ({ ...s, [field.name]: e.target.checked }))}
            />
            Skip
          </label>
        </div>
      ))}

      <div>
        <label htmlFor="knee" className="field-label">
          Knee discomfort (0 none — 10 worst imaginable)
        </label>
        <input
          id="knee"
          name="knee"
          type="range"
          min={0}
          max={10}
          step={1}
          defaultValue={0}
          disabled={kneeSkip}
          className="mt-2 h-11 w-full"
        />
        <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" name="kneeSkip" checked={kneeSkip} onChange={(e) => setKneeSkip(e.target.checked)} />
          Skip (I don&apos;t know) — today will default to a conservative, non-running recommendation until confirmed
        </label>
      </div>

      <div>
        <span className="field-label">Available time</span>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(["15", "30", "45", "60", "75", "90_plus"] as const).map((t) => (
            <label
              key={t}
              className="flex min-h-touch items-center justify-center rounded-lg border border-slate-200 text-sm"
            >
              <input type="radio" name="availableTime" value={t} defaultChecked={t === "45"} className="peer sr-only" />
              <span className="peer-checked:font-bold peer-checked:text-brand-700">
                {t === "90_plus" ? "90+" : t}
              </span>
            </label>
          ))}
        </div>
      </div>

      {needsLocation ? (
        <div>
          <span className="field-label">Strength location today</span>
          <div className="mt-2 flex gap-4">
            {(["gym", "home"] as const).map((loc) => (
              <label key={loc} className="flex items-center gap-2 text-sm capitalize">
                <input type="radio" name="strengthLocation" value={loc} defaultChecked={loc === "home"} />
                {loc}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Submitting…" : "Submit check-in"}
      </button>
    </form>
  );
}
