"use client";

import { useState } from "react";
import type { GuidedExerciseItem } from "@/lib/services/strengthGuidanceService";
import { LoadGuidance } from "@/components/load-guidance";

export type LoadTypeChoice = "weighted" | "bodyweight" | "band" | "machine";
export type BandLevelChoice = "light" | "medium" | "heavy";

export interface ExerciseEntry {
  loadType: LoadTypeChoice;
  loadValue: string;
  bandLevel: BandLevelChoice;
  sets: string;
  reps: string;
  /** null until the user intentionally sets it — never silently defaulted. */
  difficulty: number | null;
  setsDiffered: boolean;
  perSetReps: string[];
  done: boolean;
}

export function initialEntry(item: GuidedExerciseItem): ExerciseEntry {
  return {
    loadType: item.exercise.default_load_type,
    loadValue:
      item.recommendation.recommendedLoad !== null ? String(item.recommendation.recommendedLoad) : "",
    bandLevel: "medium",
    sets: String(item.setCount),
    reps: "",
    difficulty: null,
    setsDiffered: false,
    perSetReps: Array.from({ length: item.setCount }, () => ""),
    done: false,
  };
}

const DIFFICULTY_ANCHORS = [
  { value: 3, label: "easy" },
  { value: 5, label: "moderate" },
  { value: 7, label: "challenging — about 2-3 reps left" },
  { value: 9, label: "nearly maximal" },
  { value: 10, label: "maximal" },
];

const LOAD_TYPES: { value: LoadTypeChoice; label: string }[] = [
  { value: "weighted", label: "Weighted" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "band", label: "Band" },
  { value: "machine", label: "Machine" },
];

function loadUnitLabel(loadBasis: string): string {
  switch (loadBasis) {
    case "machine_total":
      return "lb (total on the machine)";
    case "per_dumbbell":
      return "lb (per dumbbell)";
    case "per_hand":
      return "lb (per hand)";
    case "single_implement":
      return "lb (the one implement)";
    default:
      return "lb";
  }
}

export function summaryText(item: GuidedExerciseItem, entry: ExerciseEntry): string {
  const perSide = item.exercise.rep_basis === "per_side" ? " per side" : "";
  const reps = entry.reps === "" ? "—" : entry.reps;
  const sets = entry.sets === "" ? "—" : entry.sets;
  let load: string;
  if (entry.loadType === "bodyweight") load = "bodyweight";
  else if (entry.loadType === "band") load = `${entry.bandLevel} band`;
  else load = entry.loadValue === "" ? "load not recorded" : `${entry.loadValue} lb`;
  const difficulty = entry.difficulty === null ? "difficulty not set" : `difficulty ${entry.difficulty}`;
  return `${sets} × ${reps}${perSide} at ${load}, ${difficulty}`;
}

export function ExerciseCard({
  item,
  index,
  entry,
  expanded,
  onChange,
  onToggleExpand,
  onMarkDone,
}: {
  item: GuidedExerciseItem;
  index: number;
  entry: ExerciseEntry;
  expanded: boolean;
  onChange: (patch: Partial<ExerciseEntry>) => void;
  onToggleExpand: () => void;
  onMarkDone: () => void;
}) {
  const [showContent, setShowContent] = useState(false);
  const perSide = item.exercise.rep_basis === "per_side";
  const needsLoadValue = entry.loadType === "weighted" || entry.loadType === "machine";

  // Collapsed summary for a completed exercise — keeps the page short.
  if (!expanded) {
    return (
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {entry.done ? "✅ " : ""}
              {item.exercise.name}
            </p>
            <p className="truncate text-xs text-slate-500">{summaryText(item, entry)}</p>
          </div>
          <button type="button" onClick={onToggleExpand} className="btn-secondary shrink-0 px-3 py-1 text-xs">
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.exercise.name}</p>
          <p className="text-xs text-slate-500">
            Prescribed {item.setCount} × {item.repRangeLow}-{item.repRangeHigh}
            {perSide ? " per side" : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {index + 1}
        </span>
      </div>

      <LoadGuidance
        recommendation={item.recommendation}
        loading={{
          loadingInstructions: item.exercise.loading_instructions,
          loadPosition: item.exercise.load_position,
          startLoadNote: item.exercise.start_load_note,
          repBasis: item.exercise.rep_basis,
        }}
      />

      <button
        type="button"
        onClick={() => setShowContent((s) => !s)}
        className="text-xs text-brand-700 underline"
      >
        {showContent ? "Hide" : "Show"} setup, cues and stop guidance
      </button>
      {showContent ? (
        <div className="space-y-2 rounded-lg border border-slate-100 p-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Setup:</span> {item.exercise.setup}
          </p>
          <p>
            <span className="font-semibold">Execution:</span> {item.exercise.execution}
          </p>
          <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">
            {item.exercise.stop_substitute_guidance}
          </p>
        </div>
      ) : null}

      <fieldset>
        <legend className="field-label">How was it loaded?</legend>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOAD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ loadType: t.value })}
              aria-pressed={entry.loadType === t.value}
              className={
                entry.loadType === t.value
                  ? "btn-primary px-2 py-1 text-xs"
                  : "btn-secondary px-2 py-1 text-xs"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      {needsLoadValue ? (
        <div>
          <label htmlFor={`load_${index}`} className="field-label">
            Load — {loadUnitLabel(item.exercise.load_basis)}
          </label>
          <input
            id={`load_${index}`}
            type="number"
            inputMode="decimal"
            step="0.5"
            value={entry.loadValue}
            onChange={(e) => onChange({ loadValue: e.target.value })}
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
                onClick={() => onChange({ bandLevel: level })}
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`sets_${index}`} className="field-label">
            Sets completed
          </label>
          <input
            id={`sets_${index}`}
            type="number"
            inputMode="numeric"
            value={entry.sets}
            onChange={(e) => onChange({ sets: e.target.value })}
            className="text-input"
          />
        </div>
        <div>
          <label htmlFor={`reps_${index}`} className="field-label">
            Reps {perSide ? "per side" : "per set"}
          </label>
          <input
            id={`reps_${index}`}
            type="number"
            inputMode="numeric"
            value={entry.reps}
            onChange={(e) => onChange({ reps: e.target.value })}
            className="text-input"
          />
        </div>
      </div>

      <div>
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={entry.setsDiffered}
            onChange={(e) => onChange({ setsDiffered: e.target.checked })}
          />
          Sets differed (log each set separately)
        </label>
        {entry.setsDiffered ? (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-100 p-2">
            {entry.perSetReps.map((value, setIdx) => (
              <div key={setIdx} className="flex items-center gap-2">
                <label htmlFor={`set_${index}_${setIdx}`} className="w-16 text-xs text-slate-600">
                  Set {setIdx + 1}
                </label>
                <input
                  id={`set_${index}_${setIdx}`}
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={value}
                  onChange={(e) => {
                    const next = [...entry.perSetReps];
                    next[setIdx] = e.target.value;
                    onChange({ perSetReps: next });
                  }}
                  className="text-input mt-0 flex-1"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ perSetReps: [...entry.perSetReps, ""] })}
              className="text-xs text-brand-700 underline"
            >
              Add a set
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="field-label">Difficulty</span>
          <span
            className={`text-sm font-semibold ${
              entry.difficulty === null ? "text-slate-400" : "text-brand-700"
            }`}
          >
            {entry.difficulty === null ? "Not set" : `${entry.difficulty}/10`}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={entry.difficulty ?? 7}
          onChange={(e) => onChange({ difficulty: Number(e.target.value) })}
          aria-label={`Difficulty for ${item.exercise.name}`}
          aria-valuetext={entry.difficulty === null ? "not set" : `${entry.difficulty} of 10`}
          className={`mt-2 h-11 w-full ${entry.difficulty === null ? "opacity-50" : ""}`}
        />
        <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
          {DIFFICULTY_ANCHORS.map((a) => (
            <li key={a.value}>
              <span className="font-medium text-slate-600">{a.value}:</span> {a.label}
            </li>
          ))}
        </ul>
        {entry.difficulty === null ? (
          <p className="mt-1 text-xs text-slate-400">Drag the slider to record a difficulty.</p>
        ) : null}
      </div>

      <button type="button" onClick={onMarkDone} className="btn-secondary w-full">
        Done with this exercise
      </button>
    </div>
  );
}
