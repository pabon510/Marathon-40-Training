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

/**
 * Restore a draft after the planned workout changed in place (for example, an
 * exercise substitution). Entries whose exercise identity is unchanged keep
 * their progress. A changed slot receives its fresh initial entry so data from
 * the original movement is never mislabelled as the substitute.
 */
export function reconcileStrengthDraft(
  raw: string | null,
  expectedExerciseIds: string[],
  initialEntries: ExerciseEntry[],
): StrengthWorkoutDraft | null {
  if (!raw || initialEntries.length !== expectedExerciseIds.length) return null;
  try {
    const value = JSON.parse(raw) as Partial<StrengthWorkoutDraft>;
    if (value.version !== STRENGTH_DRAFT_VERSION) return null;
    if (!Array.isArray(value.exerciseIds) || !Array.isArray(value.entries)) return null;
    if (value.exerciseIds.length !== expectedExerciseIds.length || value.entries.length !== expectedExerciseIds.length) return null;
    if (!value.entries.every((entry) => entry && typeof entry === "object" && typeof entry.loadType === "string" && typeof entry.done === "boolean")) return null;

    const changedIndex = expectedExerciseIds.findIndex((exerciseId, index) => value.exerciseIds![index] !== exerciseId);
    return {
      ...(value as StrengthWorkoutDraft),
      exerciseIds: expectedExerciseIds,
      entries: expectedExerciseIds.map((exerciseId, index) => (
        value.exerciseIds![index] === exerciseId
          ? value.entries![index]!
          : initialEntries[index]!
      )),
      expandedIndex: typeof value.expandedIndex === "number" && value.expandedIndex < expectedExerciseIds.length
        ? value.expandedIndex
        : changedIndex >= 0 ? changedIndex : null,
      effort: value.effort ?? null,
      highestKneeDuring: value.highestKneeDuring ?? null,
      kneeImmediatelyAfter: value.kneeImmediatelyAfter ?? null,
      unusualPain: value.unusualPain ?? false,
    };
  } catch {
    return null;
  }
}
