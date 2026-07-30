"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LabeledScale } from "@/components/labeled-scale";
import { KNEE_SCALE } from "@/domain/content/trainingScales";
import { logRecoveryAction, type RecoveryLogState } from "./actions";

const RECOVERY_EFFORT = { 1: "Very easy", 2: "Easy", 3: "Light" } as const;
const initialState: RecoveryLogState = {};

export function RecoveryLogForm() {
  const [state, action, pending] = useActionState(logRecoveryAction, initialState);
  const [effort, setEffort] = useState<number | null>(null);
  const [during, setDuring] = useState<number | null>(null);
  const [after, setAfter] = useState<number | null>(null);

  if (state.success) {
    return (
      <div className="card space-y-2">
        <p className="font-semibold text-emerald-800">Active recovery completed.</p>
        <Link href="/plan" className="text-sm text-brand-700 underline">Return to your plan</Link>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4">
      <LabeledScale label="Overall effort" name="effort" min={1} max={3} labels={RECOVERY_EFFORT} value={effort} onChange={setEffort} required />
      <LabeledScale label="Highest knee discomfort during" name="highestKneeDuring" min={0} max={10} labels={KNEE_SCALE} value={during} onChange={setDuring} required />
      <LabeledScale label="Knee discomfort immediately after" name="kneeImmediatelyAfter" min={0} max={10} labels={KNEE_SCALE} value={after} onChange={setAfter} required />
      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input type="checkbox" name="completedFull" defaultChecked />
        Completed the full routine
      </label>
      <label className="flex min-h-touch items-center gap-2 text-sm">
        <input type="checkbox" name="unusualPainFlag" />
        Unusual pain or discomfort
      </label>
      <div>
        <label htmlFor="notes" className="field-label">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={2} className="text-input" />
      </div>
      {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save active recovery"}
      </button>
    </form>
  );
}
