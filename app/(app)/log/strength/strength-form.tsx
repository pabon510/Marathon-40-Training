"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { GuidedExerciseItem } from "@/lib/services/strengthGuidanceService";
import { RedFlagWarning } from "@/components/red-flag-warning";
import { LabeledScale } from "@/components/labeled-scale";
import { EFFORT_SCALE, KNEE_SCALE } from "@/domain/content/trainingScales";
import { logStrengthAction, type LogStrengthFormState } from "./actions";
import { ExerciseCard, initialEntry, summaryText, type ExerciseEntry } from "./exercise-card";
import { metricLabel } from "@/domain/content/prescriptionMetric";
import { parseStrengthDraft, STRENGTH_DRAFT_VERSION, strengthDraftStorageKey } from "./strength-draft";

const initialState: LogStrengthFormState = {};

interface MissingField {
  exerciseName: string;
  fields: string[];
}

/** Which required-ish values were left blank, so we can ask for explicit confirmation. */
function findMissing(items: GuidedExerciseItem[], entries: ExerciseEntry[]): MissingField[] {
  const missing: MissingField[] = [];
  items.forEach((item, i) => {
    const entry = entries[i]!;
    const fields: string[] = [];
    const needsLoad = entry.loadType === "weighted" || entry.loadType === "machine";
    if (needsLoad && entry.loadValue.trim() === "") fields.push("load");
    if (entry.reps.trim() === "") fields.push(metricLabel(item.loadMetadata.prescriptionMetric).toLowerCase());
    if (entry.difficulty === null) fields.push("difficulty");
    if (fields.length > 0) missing.push({ exerciseName: item.exercise.name, fields });
  });
  return missing;
}

export function StrengthLogForm({
  items,
  defaultLocation,
  plannedWorkoutId,
  draftId,
}: {
  items: GuidedExerciseItem[];
  defaultLocation: "gym" | "home";
  plannedWorkoutId: string | null;
  draftId: string;
}) {
  const [state, formAction, pending] = useActionState(logStrengthAction, initialState);
  const [entries, setEntries] = useState<ExerciseEntry[]>(() => items.map(initialEntry));
  const [expandedIndex, setExpandedIndex] = useState<number | null>(items.length > 0 ? 0 : null);
  const [unusualPain, setUnusualPain] = useState(false);
  const [missing, setMissing] = useState<MissingField[] | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [highestKneeDuring, setHighestKneeDuring] = useState<number | null>(null);
  const [kneeImmediatelyAfter, setKneeImmediatelyAfter] = useState<number | null>(null);
  const confirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const storageKey = strengthDraftStorageKey(draftId);
  const exerciseIds = items.map((item) => item.exercise.id);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = parseStrengthDraft(window.sessionStorage.getItem(storageKey), exerciseIds);
      if (draft) {
        setEntries(draft.entries);
        setExpandedIndex(draft.expandedIndex);
        setEffort(draft.effort);
        setHighestKneeDuring(draft.highestKneeDuring);
        setKneeImmediatelyAfter(draft.kneeImmediatelyAfter);
        setUnusualPain(draft.unusualPain);
      }
      setDraftRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
    // The workout identity and ordered exercise IDs deliberately control restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!draftRestored || state.success) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      version: STRENGTH_DRAFT_VERSION,
      exerciseIds,
      entries,
      expandedIndex,
      effort,
      highestKneeDuring,
      kneeImmediatelyAfter,
      unusualPain,
    }));
  }, [draftRestored, state.success, storageKey, entries, expandedIndex, effort, highestKneeDuring, kneeImmediatelyAfter, unusualPain, exerciseIds]);

  useEffect(() => {
    if (state.success) window.sessionStorage.removeItem(storageKey);
  }, [state.success, storageKey]);

  if (state.success) {
    return (
      <div className="card space-y-2">
        <p className="text-sm font-semibold text-safety-ok">Strength workout logged.</p>
        <Link href="/history" className="text-sm text-brand-700 underline">
          View or correct it in history
        </Link>
      </div>
    );
  }

  function updateEntry(index: number, patch: Partial<ExerciseEntry>) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function markDone(index: number) {
    updateEntry(index, { done: true });
    const nextIncomplete = entries.findIndex((e, i) => i !== index && !e.done);
    setExpandedIndex(nextIncomplete === -1 ? null : nextIncomplete);
  }

  function goBack(index: number) {
    setExpandedIndex(Math.max(0, index - 1));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) return; // already confirmed; let it through
    const found = findMissing(items, entries);
    if (found.length > 0) {
      event.preventDefault();
      setMissing(found);
    }
  }

  function confirmAndSubmit() {
    confirmedRef.current = true;
    setMissing(null);
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="location" value={defaultLocation} />
      <input type="hidden" name="exerciseCount" value={items.length} />

      {items.map((item, i) => {
        const entry = entries[i]!;
        return (
          <div key={item.ordinal}>
            {/* Values are submitted as hidden inputs so the card can stay a
                controlled React component while the form posts normally. */}
            <input type="hidden" name="exerciseId" value={item.exercise.id} />
            <input type="hidden" name={`variantId_${i}`} value={item.variant.id} />
            <input type="hidden" name={`loadType_${i}`} value={entry.loadType} />
            <input
              type="hidden"
              name={`load_${i}`}
              value={entry.loadType === "weighted" || entry.loadType === "machine" ? entry.loadValue : ""}
            />
            <input
              type="hidden"
              name={`bandLevel_${i}`}
              value={entry.loadType === "band" ? entry.bandLevel : ""}
            />
            <input type="hidden" name={`sets_${i}`} value={entry.sets} />
            <input type="hidden" name={`reps_${i}`} value={entry.reps} />
            <input type="hidden" name={`metric_${i}`} value={item.loadMetadata.prescriptionMetric} />
            <input type="hidden" name={`repBasis_${i}`} value={item.loadMetadata.repScope} />
            <input
              type="hidden"
              name={`difficulty_${i}`}
              value={entry.difficulty === null ? "" : String(entry.difficulty)}
            />
            <input
              type="hidden"
              name={`perSetReps_${i}`}
              value={entry.setsDiffered ? entry.perSetReps.join(",") : ""}
            />
            <ExerciseCard
              item={item}
              index={i}
              entry={entry}
              expanded={expandedIndex === i}
              onChange={(patch) => updateEntry(i, patch)}
              onToggleExpand={() => setExpandedIndex(expandedIndex === i ? null : i)}
              onMarkDone={() => markDone(i)}
              onBack={i > 0 ? () => goBack(i) : null}
              substituteHref={
                plannedWorkoutId
                  ? `/workouts/substitute?plannedWorkoutId=${encodeURIComponent(plannedWorkoutId)}&ordinal=${item.ordinal}`
                  : null
              }
              libraryHref={`/library?exercise=${encodeURIComponent(item.exercise.slug)}&returnTo=${encodeURIComponent("/log/strength")}`}
            />
          </div>
        );
      })}

      <div className="card space-y-4">
        <p className="text-sm font-semibold text-slate-900">Post-workout check-in</p>
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
          Unusual pain
        </label>
        {unusualPain ? <RedFlagWarning /> : null}
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input type="checkbox" name="unplanned" />
          This is unplanned / extra
        </label>
        <div>
          <label htmlFor="notes" className="field-label">
            Notes (optional)
          </label>
          <textarea id="notes" name="notes" rows={2} className="text-input" />
        </div>

        {missing ? (
          <div role="alert" className="rounded-lg border-2 border-safety-warn bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Some values were left blank:</p>
            <ul className="mt-1 list-inside list-disc text-sm text-amber-900">
              {missing.map((m) => (
                <li key={m.exerciseName}>
                  {m.exerciseName} — no {m.fields.join(", ")}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-amber-900">
              Save this workout anyway? Blank values stay blank rather than being guessed.
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setMissing(null)} className="btn-secondary flex-1">
                Go back and fill in
              </button>
              <button type="button" onClick={confirmAndSubmit} className="btn-primary flex-1">
                Save anyway
              </button>
            </div>
          </div>
        ) : null}

        {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Saving…" : "Save strength workout"}
        </button>

        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">Review what will be saved</summary>
          <ul className="mt-2 space-y-1">
            {items.map((item, i) => (
              <li key={item.ordinal}>
                <span className="font-medium">{item.exercise.name}:</span> {summaryText(item, entries[i]!)}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </form>
  );
}
