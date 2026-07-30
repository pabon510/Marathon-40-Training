/**
 * Classifies an edit to a completed workout log as "material" or not.
 *
 * Per docs/BUILD_PLAN.md: a material edit includes knee score/trend,
 * effort, completion, duration/distance, run/lower-body load, or workout
 * classification. Notes-only edits do not recalculate.
 */

export interface SessionSnapshot {
  sessionType: string;
  completionState: string;
  overallEffort: number | null;
  highestKneeDuring: number | null;
  kneeImmediatelyAfter: number | null;
  completedFull: boolean | null;
  /** Run fields — absent/null for strength sessions. */
  runType: string | null;
  isStroller: boolean | null;
  distanceMiles: number | null;
  durationSeconds: number | null;
  /**
   * Stable signature of the strength work performed (sets x reps @ load per
   * exercise). Any change to prescribed/completed load counts as a change in
   * lower-body/training load.
   */
  strengthLoadSignature: string | null;
  /** Deliberately excluded from the material set. */
  notes: string | null;
}

/** Every field whose change triggers recalculation. `notes` is intentionally absent. */
export const MATERIAL_FIELDS = [
  "sessionType",
  "completionState",
  "overallEffort",
  "highestKneeDuring",
  "kneeImmediatelyAfter",
  "completedFull",
  "runType",
  "isStroller",
  "distanceMiles",
  "durationSeconds",
  "strengthLoadSignature",
] as const satisfies readonly (keyof SessionSnapshot)[];

export type MaterialField = (typeof MATERIAL_FIELDS)[number];

const FIELD_LABELS: Record<MaterialField, string> = {
  sessionType: "workout type",
  completionState: "completion",
  overallEffort: "effort",
  highestKneeDuring: "highest knee discomfort during",
  kneeImmediatelyAfter: "knee discomfort after",
  completedFull: "completed in full",
  runType: "run environment",
  isStroller: "stroller context",
  distanceMiles: "distance",
  durationSeconds: "duration",
  strengthLoadSignature: "strength load",
};

export interface MaterialEditResult {
  isMaterial: boolean;
  changedFields: MaterialField[];
  /** Plain-language summary suitable for the audit trail, or null if nothing material changed. */
  explanation: string | null;
}

export function detectMaterialChanges(
  before: SessionSnapshot,
  after: SessionSnapshot,
): MaterialEditResult {
  const changedFields = MATERIAL_FIELDS.filter((field) => before[field] !== after[field]);

  if (changedFields.length === 0) {
    return { isMaterial: false, changedFields: [], explanation: null };
  }

  const labels = changedFields.map((f) => FIELD_LABELS[f]);
  const list =
    labels.length === 1
      ? labels[0]!
      : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]!}`;

  return {
    isMaterial: true,
    changedFields,
    explanation: `A completed workout was edited (${list} changed), so the plan and progress were recalculated.`,
  };
}

/** Builds the strength signature used to detect load changes across an edit. */
export function buildStrengthLoadSignature(
  entries: {
    exerciseId: string;
    completedSets: number | null;
    representativeReps: number | null;
    loadValue: number | null;
    loadType: string | null;
    bandLevel: string | null;
  }[],
): string {
  return [...entries]
    .sort((a, b) => a.exerciseId.localeCompare(b.exerciseId))
    .map(
      (e) =>
        `${e.exerciseId}:${e.completedSets ?? "-"}x${e.representativeReps ?? "-"}@${
          e.loadValue ?? "-"
        }:${e.loadType ?? "-"}:${e.bandLevel ?? "-"}`,
    )
    .join("|");
}
