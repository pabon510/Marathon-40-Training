import {
  EXERCISES,
  getExerciseMetadataV2,
  type ExerciseContent,
  type PrescriptionMetric,
} from "@/domain/content/exerciseLibrary";

export type SubstitutionReason =
  | "prefer_machine"
  | "equipment_unavailable"
  | "uncomfortable"
  | "different_exercise"
  | "home_conversion";
export type SubstitutionQuality = "exact" | "close" | "general";
export type ExercisePreference = "prefer" | "avoid";

export interface SubstitutionCandidate {
  exercise: ExerciseContent;
  quality: SubstitutionQuality;
  matchingEquipment: string[];
  historyCompatible: boolean;
  explanation: string;
}

function groups(exercise: ExerciseContent, location: "gym" | "home"): Set<string> {
  return new Set(
    exercise.variants
      .filter((variant) => variant.location === location || variant.location === "either")
      .map((variant) => variant.equivalenceGroup),
  );
}

function sharesValue(a: string[], b: string[]): boolean {
  const values = new Set(a.map((value) => value.toLowerCase()));
  return b.some((value) => values.has(value.toLowerCase()));
}

function supportsLocation(exercise: ExerciseContent, location: "gym" | "home"): boolean {
  return exercise.variants.some((variant) => variant.location === location || variant.location === "either");
}

function hasMachineEquipment(exercise: ExerciseContent): boolean {
  return exercise.allowedLoadTypes.includes("machine")
    || exercise.equipment.some((item) => /machine|cable/i.test(item));
}

function qualityFor(
  original: ExerciseContent,
  candidate: ExerciseContent,
  location: "gym" | "home",
): SubstitutionQuality | null {
  const originalGroups = groups(original, location);
  const candidateGroups = groups(candidate, location);
  const sameGroup = [...originalGroups].some((group) => candidateGroups.has(group));
  if (sameGroup && original.movementPattern === candidate.movementPattern) return "exact";
  if (sameGroup) return "close";

  const originalMetadata = getExerciseMetadataV2(original);
  const candidateMetadata = getExerciseMetadataV2(candidate);
  const explicitlyLinked =
    originalMetadata.substitutionExerciseSlugs.includes(candidate.slug)
    || candidateMetadata.substitutionExerciseSlugs.includes(original.slug);
  return explicitlyLinked ? "general" : null;
}

const QUALITY_ORDER: Record<SubstitutionQuality, number> = { exact: 0, close: 1, general: 2 };

/**
 * Produces only curated, location-compatible alternatives. Equipment
 * preference changes ranking inside an equivalence tier; it never makes an
 * unrelated exercise eligible.
 */
export function buildSubstitutionCandidates({
  originalSlug,
  location,
  reason,
  preferences = new Map(),
  blockLowerBody = false,
  library = EXERCISES,
}: {
  originalSlug: string;
  location: "gym" | "home";
  reason: SubstitutionReason;
  preferences?: Map<string, ExercisePreference>;
  blockLowerBody?: boolean;
  library?: ExerciseContent[];
}): SubstitutionCandidate[] {
  const original = library.find((exercise) => exercise.slug === originalSlug);
  if (!original) return [];
  const originalMetadata = getExerciseMetadataV2(original);

  const candidates = library.flatMap((candidate): SubstitutionCandidate[] => {
      if (candidate.slug === original.slug || !supportsLocation(candidate, location)) return [];
      const metadata = getExerciseMetadataV2(candidate);
      if (!metadata.activeForNewPlans || metadata.legacyDisplayOnly) return [];
      if (metadata.prescriptionMetric !== originalMetadata.prescriptionMetric) return [];
      if (blockLowerBody && candidate.isLowerBody) return [];
      if (!sharesValue(original.targetMuscles, candidate.targetMuscles)) return [];
      const quality = qualityFor(original, candidate, location);
      if (!quality) return [];
      const matchingEquipment = candidate.variants
        .filter((variant) => variant.location === location || variant.location === "either")
        .flatMap((variant) => variant.equipmentRequirements);
      return [{
        exercise: candidate,
        quality,
        matchingEquipment: [...new Set(matchingEquipment)],
        historyCompatible:
          metadata.historyCompatibility === "same_family"
          && metadata.familySlug === originalMetadata.familySlug,
        explanation:
          quality === "exact"
            ? `Same ${original.movementPattern.replaceAll("_", " ")} pattern and target area.`
            : quality === "close"
              ? "Same training slot with a slightly different movement pattern."
              : "Approved alternative that preserves the main target muscles.",
      }];
    });
  const withoutAvoided = candidates.filter((candidate) => preferences.get(candidate.exercise.slug) !== "avoid");
  // Avoid remains a preference, not a hard safety rule. If every approved
  // option is avoided, keep the substitution flow usable.
  const eligible = withoutAvoided.length > 0 ? withoutAvoided : candidates;
  return eligible.sort((a, b) => {
      const quality = QUALITY_ORDER[a.quality] - QUALITY_ORDER[b.quality];
      if (quality !== 0) return quality;
      if (reason === "prefer_machine") {
        const equipment = Number(hasMachineEquipment(b.exercise)) - Number(hasMachineEquipment(a.exercise));
        if (equipment !== 0) return equipment;
      }
      const preference =
        (preferences.get(a.exercise.slug) === "avoid" ? 2 : preferences.get(a.exercise.slug) === "prefer" ? 0 : 1)
        - (preferences.get(b.exercise.slug) === "avoid" ? 2 : preferences.get(b.exercise.slug) === "prefer" ? 0 : 1);
      if (preference !== 0) return preference;
      return getExerciseMetadataV2(a.exercise).selectionPriority - getExerciseMetadataV2(b.exercise).selectionPriority;
  });
}

export function substitutionReasonLabel(reason: SubstitutionReason): string {
  return {
    prefer_machine: "Prefer a machine",
    equipment_unavailable: "Equipment unavailable",
    uncomfortable: "This movement feels uncomfortable",
    different_exercise: "I want a different exercise",
    home_conversion: "Convert for home",
  }[reason];
}

export function isSubstitutionReason(value: string): value is SubstitutionReason {
  return ["prefer_machine", "equipment_unavailable", "uncomfortable", "different_exercise", "home_conversion"].includes(value);
}

export function samePrescriptionMetric(a: PrescriptionMetric, b: PrescriptionMetric): boolean {
  return a === b;
}
