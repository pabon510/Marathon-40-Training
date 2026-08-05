"use client";

import { useState } from "react";
import type { GuidedExerciseItem } from "@/lib/services/strengthGuidanceService";
import { LoadGuidance } from "@/components/load-guidance";
import { LabeledScale } from "@/components/labeled-scale";
import { DIFFICULTY_SCALE } from "@/domain/content/trainingScales";
import { metricResultLabel, metricUnit } from "@/domain/content/prescriptionMetric";
import { selectionReasonLabel } from "@/domain/planning/selectionReason";
import Link from "next/link";

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
    // From the curated library, never the DB column — see loadMetadata.ts.
    loadType: item.loadMetadata.defaultLoadType,
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

const LOAD_TYPE_LABELS: Record<LoadTypeChoice, string> = {
  weighted: "Weighted",
  bodyweight: "Bodyweight",
  band: "Band",
  machine: "Machine",
};

function loadUnitLabel(loadScope: string): string {
  switch (loadScope) {
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
  const perSide = item.loadMetadata.repScope === "per_side" ? " per side" : "";
  const unit = metricUnit(item.loadMetadata.prescriptionMetric);
  const reps = entry.reps === "" ? "—" : entry.reps;
  const sets = entry.sets === "" ? "—" : entry.sets;
  let load: string;
  if (entry.loadType === "bodyweight") load = "bodyweight";
  else if (entry.loadType === "band") load = `${entry.bandLevel} band`;
  else load = entry.loadValue === "" ? "load not recorded" : `${entry.loadValue} lb`;
  const difficulty = entry.difficulty === null ? "difficulty not set" : `difficulty ${entry.difficulty}`;
  return `${sets} × ${reps} ${unit}${perSide} at ${load}, ${difficulty}`;
}

export function ExerciseCard({
  item,
  index,
  entry,
  expanded,
  onChange,
  onToggleExpand,
  onMarkDone,
  onBack,
  substituteHref,
  libraryHref,
  onBeforeNavigate,
}: {
  item: GuidedExerciseItem;
  index: number;
  entry: ExerciseEntry;
  expanded: boolean;
  onChange: (patch: Partial<ExerciseEntry>) => void;
  onToggleExpand: () => void;
  onMarkDone: () => void;
  /** Omit (or pass null) on the first exercise, where there's nothing to go back to. */
  onBack?: (() => void) | null;
  substituteHref?: string | null;
  libraryHref?: string;
  onBeforeNavigate?: () => void;
}) {
  // Open by default: this card is the merged "view instructions + log the
  // set" screen, so there's no separate read-only guided-mode pass first.
  const [showContent, setShowContent] = useState(true);
  const perSide = item.loadMetadata.repScope === "per_side";
  const metric = item.loadMetadata.prescriptionMetric;
  const unit = metricUnit(metric);
  // Only load types this exercise actually supports: a leg press cannot be
  // logged as bodyweight, a pushup cannot be logged as machine.
  const allowedLoadTypes = item.loadMetadata.allowedLoadTypes;
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
            Prescribed {item.setCount} × {item.repRangeLow}-{item.repRangeHigh} {unit}
            {perSide ? " per side" : ""}
          </p>
          <p className="mt-1 text-xs text-brand-700">
            {selectionReasonLabel(item.selectionReasonCode)}
          </p>
          <Link
            href={libraryHref ?? `/library?exercise=${encodeURIComponent(item.exercise.slug)}`}
            onClick={onBeforeNavigate}
            className="inline-flex min-h-touch items-center text-xs font-medium text-brand-700 underline"
          >
            View in Library
          </Link>
          {substituteHref ? (
            <Link
              href={substituteHref}
              onClick={onBeforeNavigate}
              className="ml-4 inline-flex min-h-touch items-center text-xs font-medium text-brand-700 underline"
            >
              Substitute
            </Link>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {index + 1}
        </span>
      </div>

      <LoadGuidance recommendation={item.recommendation} metadata={item.loadMetadata} />

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
          {((item.exercise.cues as string[]) ?? []).length > 0 ? (
            <div>
              <p className="font-semibold">Cues</p>
              <ul className="list-inside list-disc">
                {((item.exercise.cues as string[]) ?? []).map((cue, idx) => (
                  <li key={idx}>{cue}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {((item.exercise.mistakes as string[]) ?? []).length > 0 ? (
            <div>
              <p className="font-semibold">Common mistakes</p>
              <ul className="list-inside list-disc">
                {((item.exercise.mistakes as string[]) ?? []).map((mistake, idx) => (
                  <li key={idx}>{mistake}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">
            {item.exercise.stop_substitute_guidance}
          </p>
        </div>
      ) : null}

      {allowedLoadTypes.length > 1 ? (
        <fieldset>
          <legend className="field-label">How was it loaded?</legend>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {allowedLoadTypes.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ loadType: value })}
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
          <label htmlFor={`load_${index}`} className="field-label">
            Load — {loadUnitLabel(item.loadMetadata.loadScope)}
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
            {metricResultLabel(metric, item.loadMetadata.repScope)}
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

      {metric === "reps" ? <div>
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
      </div> : null}

      <LabeledScale
        label={`Difficulty for ${item.exercise.name}`}
        min={1}
        max={10}
        labels={DIFFICULTY_SCALE}
        value={entry.difficulty}
        onChange={(difficulty) => onChange({ difficulty })}
      />

      <div className="flex gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-secondary flex-1">
            Back
          </button>
        ) : null}
        <button type="button" onClick={onMarkDone} className="btn-primary flex-1">
          Done with this exercise
        </button>
      </div>
    </div>
  );
}
