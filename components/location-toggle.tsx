"use client";

import { useTransition } from "react";
import { setLocationChoice } from "@/app/(app)/workouts/actions";

export function LocationToggle({
  plannedWorkoutId,
  current,
}: {
  plannedWorkoutId: string;
  current: "gym" | "home" | "unspecified";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {(["home", "gym"] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setLocationChoice(plannedWorkoutId, loc))}
          className={current === loc ? "btn-primary flex-1 capitalize" : "btn-secondary flex-1 capitalize"}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
