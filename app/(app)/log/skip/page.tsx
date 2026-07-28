"use client";

import { useActionState } from "react";
import { skipTodayAction, type SkipFormState } from "./actions";

const initialState: SkipFormState = {};

export default function SkipPage() {
  const [state, formAction, pending] = useActionState(skipTodayAction, initialState);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Skip today&apos;s workout</h1>
      <form action={formAction} className="card space-y-4">
        <div>
          <label htmlFor="reason" className="field-label">
            Reason
          </label>
          <textarea id="reason" name="reason" rows={3} required className="text-input" />
        </div>
        <p className="text-xs text-slate-500">
          Skipping never creates workout debt — the remaining week recalculates around it.
        </p>
        {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}
        <button type="submit" disabled={pending} className="btn-danger w-full">
          {pending ? "Saving…" : "Confirm skip"}
        </button>
      </form>
    </div>
  );
}
