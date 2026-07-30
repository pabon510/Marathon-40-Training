"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { RedFlagWarning } from "@/components/red-flag-warning";
import { LabeledScale } from "@/components/labeled-scale";
import { EFFORT_SCALE, KNEE_SCALE } from "@/domain/content/trainingScales";
import type { GarminExtraction } from "@/domain/import/garminScreenshot";
import { extractionToFormValues, type GarminFormValues } from "@/domain/import/garminForm";
import { logRunAction, type LogRunFormState } from "./actions";
import { GarminScreenshotImport } from "./garmin-screenshot-import";

const initialState: LogRunFormState = {};

export function RunLogForm({
  defaultStroller,
  strollerAllowed,
}: {
  defaultStroller: boolean;
  strollerAllowed: boolean;
}) {
  const [state, formAction, pending] = useActionState(logRunAction, initialState);
  const [isOverride, setIsOverride] = useState(false);
  const [unusualPain, setUnusualPain] = useState(false);
  const [isStroller, setIsStroller] = useState(defaultStroller && strollerAllowed);
  const [runType, setRunType] = useState<"outdoor" | "treadmill" | "run_walk">("outdoor");
  const [effort, setEffort] = useState<number | null>(null);
  const [highestKneeDuring, setHighestKneeDuring] = useState<number | null>(null);
  const [kneeImmediatelyAfter, setKneeImmediatelyAfter] = useState<number | null>(null);
  const [importId, setImportId] = useState("");
  const [extraction, setExtraction] = useState<GarminExtraction>();
  const [values, setValues] = useState<GarminFormValues>({
    distanceMiles: "", durationMinutes: "", paceOverrideMinutes: "", averageHr: "",
    maximumHr: "", elevationGainFeet: "", movingDurationSeconds: "", elapsedDurationSeconds: "",
    movingPaceSecondsPerMile: "", bestPaceSecondsPerMile: "", elevationLossFeet: "",
    aerobicTrainingEffect: "", anaerobicTrainingEffect: "", averageTemperatureF: "",
    averageCadenceSpm: "", maximumCadenceSpm: "", averageStrideLengthMeters: "",
  });

  function setValue(name: keyof GarminFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function applyImport(id: string, result: GarminExtraction) {
    setImportId(id);
    setExtraction(result);
    setValues(extractionToFormValues(result));
  }

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
      <GarminScreenshotImport onImported={applyImport} />
      <input type="hidden" name="importId" value={importId} />
      {importId ? (
        <div className="rounded-lg border border-safety-ok/40 bg-green-50 p-3">
          <p className="text-sm font-semibold text-green-900">Garmin draft ready for review</p>
          <p className="mt-1 text-xs text-green-800">
            Check every value below. You can correct or clear anything before saving.
          </p>
          {extraction?.warnings.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">
              {extraction.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div>
        <span className="field-label">Type</span>
        <div className="mt-2 flex gap-4">
          {(["outdoor", "treadmill", "run_walk"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="radio"
                name="runType"
                value={t}
                checked={runType === t}
                onChange={() => {
                  setRunType(t);
                  if (t === "treadmill") setIsStroller(false);
                }}
              />
              {t.replace("_", "-")}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <label className="flex min-h-touch items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="isStroller"
            checked={isStroller}
            disabled={!strollerAllowed}
            onChange={(event) => {
              setIsStroller(event.target.checked);
              if (event.target.checked && runType === "treadmill") setRunType("outdoor");
            }}
          />
          Jogging-stroller run
        </label>
        <p className="mt-1 text-xs text-slate-500">
          {strollerAllowed
            ? "Counts fully toward time, mileage, and consistency. Pace is compared only with other stroller runs."
            : "Stroller context is available only for easy and long runs."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="distanceMiles" className="field-label">
            Distance (miles)
          </label>
          <input id="distanceMiles" name="distanceMiles" type="number" step="0.01" inputMode="decimal" className="text-input" value={values.distanceMiles} onChange={(e) => setValue("distanceMiles", e.target.value)} />
        </div>
        <div>
          <label htmlFor="durationMinutes" className="field-label">
            Duration (M:SS)
          </label>
          <input id="durationMinutes" name="durationMinutes" type="text" inputMode="numeric" placeholder="35:02" className="text-input" value={values.durationMinutes} onChange={(e) => setValue("durationMinutes", e.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="paceOverrideMinutes" className="field-label">
          Pace override (M:SS/mi, optional)
        </label>
        <input
          id="paceOverrideMinutes"
          name="paceOverrideMinutes"
          type="text"
          inputMode="numeric"
          placeholder="10:32"
          className="text-input"
          value={values.paceOverrideMinutes}
          onChange={(e) => setValue("paceOverrideMinutes", e.target.value)}
        />
        <p className="field-hint">Pace is otherwise calculated automatically from distance/duration.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="averageHr" className="field-label">
            Average HR
          </label>
          <input id="averageHr" name="averageHr" type="number" inputMode="numeric" className="text-input" value={values.averageHr} onChange={(e) => setValue("averageHr", e.target.value)} />
        </div>
        <div>
          <label htmlFor="maximumHr" className="field-label">
            Max HR
          </label>
          <input id="maximumHr" name="maximumHr" type="number" inputMode="numeric" className="text-input" value={values.maximumHr} onChange={(e) => setValue("maximumHr", e.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="elevationGainFeet" className="field-label">
          Elevation gain (feet, optional)
        </label>
        <input id="elevationGainFeet" name="elevationGainFeet" type="number" inputMode="numeric" className="text-input" value={values.elevationGainFeet} onChange={(e) => setValue("elevationGainFeet", e.target.value)} />
      </div>

      {importId ? (
        <details className="rounded-lg border border-slate-200 p-3" open>
          <summary className="cursor-pointer text-sm font-semibold">Additional Garmin details</summary>
          <p className="mt-1 text-xs text-slate-500">Optional extracted values. Correct or clear any field.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([
              ["movingDurationSeconds", "Moving time (M:SS)", "clock"],
              ["elapsedDurationSeconds", "Elapsed time (M:SS)", "clock"],
              ["movingPaceSecondsPerMile", "Moving pace (M:SS/mi)", "clock"],
              ["bestPaceSecondsPerMile", "Best pace (M:SS/mi)", "clock"],
              ["elevationLossFeet", "Elevation loss (ft)", "0.01"],
              ["aerobicTrainingEffect", "Aerobic effect", "0.1"],
              ["anaerobicTrainingEffect", "Anaerobic effect", "0.1"],
              ["averageTemperatureF", "Avg temperature (°F)", "0.1"],
              ["averageCadenceSpm", "Avg cadence (spm)", "0.1"],
              ["maximumCadenceSpm", "Max cadence (spm)", "0.1"],
              ["averageStrideLengthMeters", "Stride length (m)", "0.01"],
            ] as const).map(([name, label, step]) => (
              <div key={name}>
                <label htmlFor={name} className="field-label">{label}</label>
                <input
                  id={name}
                  name={name}
                  type={step === "clock" ? "text" : "number"}
                  min={step === "clock" ? undefined : "0"}
                  step={step === "clock" ? undefined : step}
                  inputMode={step === "clock" ? "numeric" : "decimal"}
                  className="text-input"
                  value={values[name]}
                  onChange={(event) => setValue(name, event.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Confidence and source evidence remain attached to this import for traceability.
          </p>
        </details>
      ) : null}

      <LabeledScale label="Overall effort" name="effort" min={1} max={10} labels={EFFORT_SCALE} value={effort} onChange={setEffort} required />
      <LabeledScale label="Highest knee discomfort during" name="highestKneeDuring" min={0} max={10} labels={KNEE_SCALE} value={highestKneeDuring} onChange={setHighestKneeDuring} required />
      <LabeledScale label="Knee discomfort immediately after" name="kneeImmediatelyAfter" min={0} max={10} labels={KNEE_SCALE} value={kneeImmediatelyAfter} onChange={setKneeImmediatelyAfter} required />

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

      {isStroller ? (
        <fieldset>
          <legend className="field-label">Did pushing the stroller cause unusual discomfort? (optional)</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["knee", "Knee"],
              ["back", "Back"],
              ["shoulder_arm", "Shoulder/arm"],
              ["other", "Other"],
            ].map(([value, label]) => (
              <label key={value} className="flex min-h-touch items-center gap-2 text-sm">
                <input type="checkbox" name="strollerDiscomfortAreas" value={value} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

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
