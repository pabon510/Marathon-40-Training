"use client";

import { useTransition } from "react";
import { setRunContext } from "@/app/(app)/workouts/actions";
import type { RunContext } from "@/domain/running/runContext";

export function RunContextToggle({
  plannedWorkoutId,
  current,
}: {
  plannedWorkoutId: string;
  current: RunContext;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <p className="field-label">Run context</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {(["standard", "stroller"] as const).map((context) => (
          <button
            key={context}
            type="button"
            disabled={pending}
            aria-pressed={current === context}
            onClick={() => startTransition(() => setRunContext(plannedWorkoutId, context))}
            className={current === context ? "btn-primary" : "btn-secondary"}
          >
            {context === "stroller" ? "Jogging stroller" : "Standard run"}
          </button>
        ))}
      </div>
    </div>
  );
}

