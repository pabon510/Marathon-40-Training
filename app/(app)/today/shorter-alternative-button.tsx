"use client";

import { useActionState } from "react";
import { useShorterAlternativeAction, type ShorterAlternativeState } from "./shorter-alternative-actions";

const initialState: ShorterAlternativeState = {};

export function ShorterAlternativeButton({ shorterMinutes }: { shorterMinutes: number }) {
  const [state, action, pending] = useActionState(useShorterAlternativeAction, initialState);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="shorterMinutes" value={shorterMinutes} />
      {state.error ? <p className="mb-2 text-sm font-medium text-safety-block">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-secondary w-full">
        {pending ? "Updating today…" : `Use ${shorterMinutes}-minute version`}
      </button>
    </form>
  );
}
