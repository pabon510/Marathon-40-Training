"use client";

import { useActionState } from "react";
import { WORKOUT_MOVE_REASONS } from "@/domain/planning/workoutMove";
import { moveWorkoutAction, type MoveWorkoutFormState } from "./actions";

const initialState: MoveWorkoutFormState = {};

export function MoveWorkoutForm({
  candidates,
  preferredSourceId,
  replacedLabel,
}: {
  candidates: { id: string; label: string; dateLabel: string; detail: string; disabledReason: string | null; spacingNote: string | null }[];
  preferredSourceId: string | null;
  replacedLabel: string;
}) {
  const [state, action, pending] = useActionState(moveWorkoutAction, initialState);
  const initialCandidate = candidates.find((candidate) => candidate.id === preferredSourceId && !candidate.disabledReason)
    ?? candidates.find((candidate) => !candidate.disabledReason);

  return (
    <form action={action} className="space-y-4">
      <fieldset className="card space-y-3">
        <legend className="field-label px-1">Which planned workout do you want to do today?</legend>
        {candidates.map((candidate) => (
          <label key={candidate.id} className={`block rounded-xl border p-3 ${candidate.disabledReason ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="sourceWorkoutId"
                value={candidate.id}
                defaultChecked={candidate.id === initialCandidate?.id}
                disabled={Boolean(candidate.disabledReason)}
                className="mt-1 h-5 w-5"
              />
              <span>
                <strong className="block text-sm text-slate-950">{candidate.label}</strong>
                <span className="block text-xs text-slate-500">{candidate.dateLabel} · {candidate.detail}</span>
                {candidate.disabledReason ? <span className="mt-1 block text-xs font-medium text-red-700">{candidate.disabledReason}</span> : null}
                {candidate.spacingNote ? <span className="mt-2 block rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{candidate.spacingNote}</span> : null}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <section className="card border-amber-200 bg-amber-50">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">What happens to today’s workout?</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          {replacedLabel} will be dropped from this week without creating workout debt. The moved workout keeps its original prescription and earns normal plan credit when logged.
        </p>
      </section>

      <div className="card space-y-4">
        <div>
          <label htmlFor="reasonCode" className="field-label">Why did the schedule change?</label>
          <select id="reasonCode" name="reasonCode" className="text-input" defaultValue="family_conflict">
            {WORKOUT_MOVE_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="reasonDetail" className="field-label">Short explanation</label>
          <input id="reasonDetail" name="reasonDetail" className="text-input" defaultValue="Family schedule changed" required />
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" required className="mt-1 h-4 w-4" />
          <span>I understand this replaces today’s workout rather than adding another session.</span>
        </label>
        {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={pending || !initialCandidate}>
          {pending ? "Updating today…" : "Use this workout today"}
        </button>
      </div>
    </form>
  );
}
