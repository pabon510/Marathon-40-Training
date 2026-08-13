"use client";

import type { GarminExtraction } from "@/domain/import/garminScreenshot";
import type { ReviewedIntervalStep } from "@/domain/import/runIntervals";
import { formatSecondsAsClock } from "@/domain/import/garminForm";

export function reviewedStepsFromExtraction(extraction: GarminExtraction): ReviewedIntervalStep[] {
  return extraction.intervalSteps.map(({ questionable, warning: _warning, ...step }) => ({
    ...step,
    included: !questionable,
  }));
}

function parseClock(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length !== 2) return null;
  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) return null;
  return minutes * 60 + seconds;
}

export function IntervalReview({
  extraction,
  steps,
  onChange,
}: {
  extraction: GarminExtraction;
  steps: ReviewedIntervalStep[];
  onChange: (steps: ReviewedIntervalStep[]) => void;
}) {
  if (steps.length === 0) return null;

  function update(ordinal: number, changes: Partial<ReviewedIntervalStep>) {
    onChange(steps.map((step) => step.ordinal === ordinal ? { ...step, ...changes } : step));
  }

  const warningByOrdinal = new Map(extraction.intervalSteps.map((step) => [step.ordinal, step.warning]));
  const workCount = steps.filter((step) => step.included && step.stepType === "work").length;

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Structured intervals</h2>
          <p className="mt-1 text-sm text-slate-600">
            {workCount} included work interval{workCount === 1 ? "" : "s"}. Review each row before saving.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-800">Garmin</span>
      </div>

      <div className="mt-3 space-y-3">
        {steps.map((step) => {
          const warning = warningByOrdinal.get(step.ordinal);
          const title = step.stepType === "work" && step.repetitionNumber
            ? `Work ${step.repetitionNumber}`
            : step.stepType.charAt(0).toUpperCase() + step.stepType.slice(1);
          return (
            <article key={step.ordinal} className={`rounded-lg border p-3 ${step.included ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50"}`}>
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-slate-900">{title}</strong>
                <label className="flex min-h-touch items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={step.included}
                    onChange={(event) => update(step.ordinal, { included: event.target.checked })}
                  />
                  Include
                </label>
              </div>
              {warning ? <p className="mb-2 text-xs font-medium text-amber-800">Review: {warning}</p> : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div>
                  <label className="field-label" htmlFor={`interval-time-${step.ordinal}`}>Time</label>
                  <input
                    id={`interval-time-${step.ordinal}`}
                    className="text-input"
                    type="text"
                    inputMode="numeric"
                    defaultValue={formatSecondsAsClock(step.durationSeconds)}
                    placeholder="5:00"
                    onBlur={(event) => update(step.ordinal, { durationSeconds: parseClock(event.target.value) })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`interval-distance-${step.ordinal}`}>Miles</label>
                  <input
                    id={`interval-distance-${step.ordinal}`}
                    className="text-input"
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    defaultValue={step.distanceMiles ?? ""}
                    onBlur={(event) => update(step.ordinal, { distanceMiles: event.target.value ? Number(event.target.value) : null })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="field-label" htmlFor={`interval-pace-${step.ordinal}`}>Pace</label>
                  <input
                    id={`interval-pace-${step.ordinal}`}
                    className="text-input"
                    type="text"
                    inputMode="numeric"
                    defaultValue={formatSecondsAsClock(step.averagePaceSecondsPerMile)}
                    placeholder="8:00"
                    onBlur={(event) => update(step.ordinal, { averagePaceSecondsPerMile: parseClock(event.target.value) })}
                  />
                </div>
              </div>
              {(step.averageHeartRate !== null || step.maximumHeartRate !== null) ? (
                <p className="mt-2 text-xs text-slate-600">
                  {step.averageHeartRate !== null ? `${step.averageHeartRate} bpm average` : "Average HR unavailable"}
                  {step.maximumHeartRate !== null ? ` · ${step.maximumHeartRate} bpm max` : ""}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-600">
        Excluded rows remain attached as extraction evidence but are ignored by workout analysis.
      </p>
    </section>
  );
}
