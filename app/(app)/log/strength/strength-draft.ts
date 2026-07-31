import type { ExerciseEntry } from "./exercise-card";

export const STRENGTH_DRAFT_VERSION = 1;

export interface StrengthWorkoutDraft {
  version: number;
  exerciseIds: string[];
  entries: ExerciseEntry[];
  expandedIndex: number | null;
  effort: number | null;
  highestKneeDuring: number | null;
  kneeImmediatelyAfter: number | null;
  unusualPain: boolean;
}

export function strengthDraftStorageKey(draftId: string) {
  return `marathon40:strength-draft:${draftId}`;
}

export function parseStrengthDraft(raw: string | null, expectedExerciseIds: string[]): StrengthWorkoutDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StrengthWorkoutDraft>;
    if (value.version !== STRENGTH_DRAFT_VERSION) return null;
    if (!Array.isArray(value.exerciseIds) || value.exerciseIds.join("|") !== expectedExerciseIds.join("|")) return null;
    if (!Array.isArray(value.entries) || value.entries.length !== expectedExerciseIds.length) return null;
    if (!value.entries.every((entry) => entry && typeof entry === "object" && typeof entry.loadType === "string" && typeof entry.done === "boolean")) return null;
    return value as StrengthWorkoutDraft;
  } catch {
    return null;
  }
}
