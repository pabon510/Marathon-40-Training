import type { WorkoutKind } from "@/domain/types";

export function shorterAlternativeMinutes(plannedMinutes: number): number {
  return Math.max(15, Math.round(plannedMinutes * 0.6));
}

export function canUseShorterAlternative(input: {
  kind: WorkoutKind;
  status: string;
  plannedMinutes: number;
}): boolean {
  return (
    !["completed", "partial", "blocked"].includes(input.status)
    && input.kind !== "active_recovery"
    && input.plannedMinutes > 25
  );
}
