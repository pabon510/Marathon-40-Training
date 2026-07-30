"use client";

import { useMemo, useState } from "react";
import {
  filterExerciseLibrary,
  type ExerciseLibraryEntry,
} from "@/domain/content/exerciseLibraryBrowser";
import { metricLabel } from "@/domain/content/prescriptionMetric";

function label(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function locationLabel(locations: ExerciseLibraryEntry["locations"]): string {
  if (locations.includes("either")) return "Gym or home";
  return locations.map(label).join(" · ");
}

function RelationshipList({ title, names }: { title: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-1 text-sm text-slate-700">{names.join(" · ")}</p>
    </div>
  );
}

function ExerciseDetails({ exercise }: { exercise: ExerciseLibraryEntry }) {
  return (
    <details className="card group">
      <summary className="flex min-h-touch cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{exercise.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {label(exercise.movementPattern)} · {locationLabel(exercise.locations)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {exercise.targetMuscles.map((muscle) => (
              <span key={muscle} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {label(muscle)}
              </span>
            ))}
          </div>
        </div>
        <span aria-hidden="true" className="mt-1 text-lg text-brand-700 group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Equipment</h4>
            <p className="mt-1 text-sm text-slate-700">
              {exercise.equipment.length > 0 ? exercise.equipment.map(label).join(" · ") : "No equipment"}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prescription</h4>
            <p className="mt-1 text-sm text-slate-700">
              {metricLabel(exercise.prescriptionMetric)}
              {exercise.repBasis === "per_side" ? " per side" : ""} ·{" "}
              {exercise.allowedLoadTypes.map(label).join(" or ")}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-800">Setup</h4>
          <p className="mt-1 text-sm text-slate-700">{exercise.setup}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">How to perform it</h4>
          <p className="mt-1 text-sm text-slate-700">{exercise.execution}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Key cues</h4>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
              {exercise.cues.map((cue) => <li key={cue}>{cue}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Common mistakes</h4>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
              {exercise.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}
            </ul>
          </div>
        </div>
        <div className="rounded-lg bg-brand-50 p-3">
          <h4 className="text-sm font-semibold text-brand-900">Loading guidance</h4>
          <p className="mt-1 text-sm text-brand-900">{exercise.loadingInstructions}</p>
          {exercise.loadPosition ? <p className="mt-1 text-xs text-brand-800">Position: {exercise.loadPosition}</p> : null}
          {exercise.startLoadNote ? <p className="mt-1 text-xs text-brand-800">{exercise.startLoadNote}</p> : null}
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">Stop or substitute: </span>
          {exercise.stopSubstituteGuidance}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RelationshipList title="Progress toward" names={exercise.progressionNames} />
          <RelationshipList title="Regress to" names={exercise.regressionNames} />
          <RelationshipList title="Approved substitutes" names={exercise.substitutionNames} />
        </div>
      </div>
    </details>
  );
}

export function ExerciseLibraryBrowser({ entries }: { entries: ExerciseLibraryEntry[] }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<"all" | "gym" | "home">("all");
  const [movementPattern, setMovementPattern] = useState("");
  const [equipment, setEquipment] = useState("");
  const [targetMuscle, setTargetMuscle] = useState("");

  const movements = useMemo(() => unique(entries.map((entry) => entry.movementPattern)), [entries]);
  const equipmentOptions = useMemo(() => unique(entries.flatMap((entry) => entry.equipment)), [entries]);
  const muscleOptions = useMemo(() => unique(entries.flatMap((entry) => entry.targetMuscles)), [entries]);
  const filtered = useMemo(
    () => filterExerciseLibrary(entries, { query, location, movementPattern, equipment, targetMuscle }),
    [entries, query, location, movementPattern, equipment, targetMuscle],
  );
  const hasFilters = Boolean(query || location !== "all" || movementPattern || equipment || targetMuscle);

  return (
    <div className="space-y-4">
      <section aria-label="Exercise filters" className="card space-y-3">
        <div>
          <label htmlFor="library-search" className="field-label">Search exercises</label>
          <input
            id="library-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try calf, core, dumbbell…"
            className="text-input"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="library-location" className="field-label">Location</label>
            <select id="library-location" value={location} onChange={(event) => setLocation(event.target.value as typeof location)} className="text-input">
              <option value="all">All locations</option>
              <option value="gym">Gym</option>
              <option value="home">Home</option>
            </select>
          </div>
          <div>
            <label htmlFor="library-movement" className="field-label">Movement</label>
            <select id="library-movement" value={movementPattern} onChange={(event) => setMovementPattern(event.target.value)} className="text-input">
              <option value="">All movements</option>
              {movements.map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="library-equipment" className="field-label">Equipment</label>
            <select id="library-equipment" value={equipment} onChange={(event) => setEquipment(event.target.value)} className="text-input">
              <option value="">All equipment</option>
              {equipmentOptions.map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="library-muscle" className="field-label">Target area</label>
            <select id="library-muscle" value={targetMuscle} onChange={(event) => setTargetMuscle(event.target.value)} className="text-input">
              <option value="">All target areas</option>
              {muscleOptions.map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-slate-600">
            {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setLocation("all");
                setMovementPattern("");
                setEquipment("");
                setTargetMuscle("");
              }}
              className="text-sm font-medium text-brand-700 underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((exercise) => <ExerciseDetails key={exercise.slug} exercise={exercise} />)}
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-sm font-semibold text-slate-800">No exercises match those filters.</p>
          <p className="mt-1 text-sm text-slate-500">Try removing a filter or using a broader search.</p>
        </div>
      )}
    </div>
  );
}

