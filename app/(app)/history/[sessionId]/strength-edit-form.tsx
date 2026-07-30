"use client";

import { useActionState, useState } from "react";
import type { SessionDetail } from "@/lib/services/historyService";
import { getExerciseLoadMetadata, resolveHistoricalLoadType } from "@/domain/content/loadMetadata";
import { RedFlagWarning } from "@/components/red-flag-warning";
import { saveStrengthEdit, type EditFormState } from "./actions";
import { PostWorkoutFields, SaveResult } from "./edit-shared";
import { metricResultLabel } from "@/domain/content/prescriptionMetric";

const initialState: EditFormState = {};

type LoadType = "weighted" | "bodyweight" | "band" | "machine";
type BandLevel = "light" | "medium" | "heavy";

interface EntryState {
  loadType: LoadType;
  loadValue: string;
  bandLevel: BandLevel;
  sets: string;
  reps: string;
  difficulty: string;
}

const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  weighted: "Weighted",
  bodyweight: "Bodyweight",
  band: "Band",
  machine: "Machine",
};

export function StrengthEditForm({ detail }: { detail: SessionDetail }) {
  const [state, formAction, pending] = useActionState(saveStrengthEdit, initialState);
  const [unusualPain, setUnusualPain] = useState(detail.session.unusual_pain_flag);
  const [entries, setEntries] = useState<EntryState[]>(() =>
    detail.strengthLogs.map((log) => ({
      // Resolved from the curated library and the recorded load, so a log
      // saved before load_type existed is not shown as bodyweight.
      loadType: resolveHistoricalLoadType(
        log.load_value,
        log.load_type,
        getExerciseLoadMetadata(log.exercise.slug),
      ),
      loadValue: log.load_value !== null ? String(log.load_value) : "",
      bandLevel: (log.band_level ?? "medium") as BandLevel,
      sets: log.completed_sets !== null ? String(log.completed_sets) : "",
      reps:
        log.completed_seconds !== null
          ? String(log.completed_seconds)
          : log.completed_distance_feet !== null
            ? String(log.completed_distance_feet)
            : log.completed_steps !== null
              ? String(log.completed_steps)
              : log.representative_reps !== null
                ? String(log.representative_reps)
                : "",
      difficulty: log.difficulty !== null ? String(log.difficulty) : "",
    })),
  );

  function update(index: number, patch: Partial<EntryState>) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  const check = detail.postCheckIn;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="sessionId" value={detail.session.id} />

      {detail.strengthLogs.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-600">No exercises were logged for this session.</p>
        </div>
      ) : null}

      {detail.strengthLogs.map((log, i) => {
        const entry = entries[i]!;
        const metadata = getExerciseLoadMetadata(log.exercise.slug);
        const needsLoadValue = entry.loadType === "weighted" || entry.loadType === "machine";
        return (
          <div key={log.id} className="card space-y-3">
            <input type="hidden" name="strengthLogId" value={log.id} />
            <input type="hidden" name={`loadType_${i}`} value={entry.loadType} />
            <input type="hidden" name={`load_${i}`} value={needsLoadValue ? entry.loadValue : ""} />
            <input type="hidden" name={`bandLevel_${i}`} value={entry.loadType === "band" ? entry.bandLevel : ""} />
            <input type="hidden" name={`sets_${i}`} value={entry.sets} />
            <input type="hidden" name={`reps_${i}`} value={entry.reps} />
            <input type="hidden" name={`metric_${i}`} value={metadata.prescriptionMetric} />
            <input type="hidden" name={`difficulty_${i}`} value={entry.difficulty} />

            <div>
              <p className="text-sm font-semibold text-slate-900">{log.exercise.name}</p>
              <p className="text-xs text-slate-500">{metadata.loadingInstructions}</p>
            </div>

            {metadata.allowedLoadTypes.length > 1 ? (
              <fieldset>
                <legend className="field-label">How was it loaded?</legend>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {metadata.allowedLoadTypes.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update(i, { loadType: value })}
                      aria-pressed={entry.loadType === value}
                      className={
                        entry.loadType === value
                          ? "btn-primary px-2 py-1 text-xs"
                          : "btn-secondary px-2 py-1 text-xs"
                      }
                    >
                      {LOAD_TYPE_LABELS[value]}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {needsLoadValue ? (
              <div>
                <label htmlFor={`loadInput_${i}`} className="field-label">
                  Load (lb)
                </label>
                <input
                  id={`loadInput_${i}`}
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  value={entry.loadValue}
                  onChange={(e) => update(i, { loadValue: e.target.value })}
                  className="text-input"
                />
              </div>
            ) : null}

            {entry.loadType === "band" ? (
              <div>
                <span className="field-label">Band level</span>
                <div className="mt-1 flex gap-2">
                  {(["light", "medium", "heavy"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update(i, { bandLevel: level })}
                      aria-pressed={entry.bandLevel === level}
                      className={
                        entry.bandLevel === level
                          ? "btn-primary flex-1 px-2 py-1 text-xs capitalize"
                          : "btn-secondary flex-1 px-2 py-1 text-xs capitalize"
                      }
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor={`setsInput_${i}`} className="field-label">
                  Sets
                </label>
                <input
                  id={`setsInput_${i}`}
                  type="number"
                  inputMode="numeric"
                  value={entry.sets}
                  onChange={(e) => update(i, { sets: e.target.value })}
                  className="text-input"
                />
              </div>
              <div>
                <label htmlFor={`repsInput_${i}`} className="field-label">
                  {metricResultLabel(metadata.prescriptionMetric, metadata.repScope)}
                </label>
                <input
                  id={`repsInput_${i}`}
                  type="number"
                  inputMode="numeric"
                  value={entry.reps}
                  onChange={(e) => update(i, { reps: e.target.value })}
                  className="text-input"
                />
              </div>
              <div>
                <label htmlFor={`difficultyInput_${i}`} className="field-label">
                  Difficulty
                </label>
                <input
                  id={`difficultyInput_${i}`}
                  type="number"
                  min={1}
                  max={10}
                  inputMode="numeric"
                  value={entry.difficulty}
                  onChange={(e) => update(i, { difficulty: e.target.value })}
                  className="text-input"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Leave a field blank to record it as not captured. Changing sets, the recorded result, or load clears any per-set
              detail saved for this exercise.
            </p>
          </div>
        );
      })}

      <div className="card space-y-4">
        <p className="text-sm font-semibold text-slate-900">Post-workout check-in</p>
        <PostWorkoutFields
          overallEffort={check?.overall_effort ?? detail.session.overall_effort ?? 5}
          highestKneeDuring={check?.highest_knee_during ?? 0}
          kneeImmediatelyAfter={check?.knee_immediately_after ?? 0}
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
      </div>
    </form>
  );
}
