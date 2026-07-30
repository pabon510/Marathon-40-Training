import type { Location } from "@/domain/types";

export interface VariantOption {
  id: string;
  exerciseId: string;
  location: Location | "either";
  equivalenceGroup: string;
  isShortOption: boolean;
  exerciseSlug?: string;
  selectionPriority?: number;
  activeForNewPlans?: boolean;
  safetyEligible?: boolean;
  isPersistedSelection?: boolean;
  hasCompatibleHistory?: boolean;
  rotationEligible?: boolean;
  preference?: "prefer" | "avoid";
}

function compareVariants(a: VariantOption, b: VariantOption, location: Location, wantShort: boolean): number {
  const booleans: Array<[boolean, boolean]> = [
    [wantShort ? a.isShortOption : !a.isShortOption, wantShort ? b.isShortOption : !b.isShortOption],
    [a.isPersistedSelection === true, b.isPersistedSelection === true],
    [a.preference === "prefer", b.preference === "prefer"],
    [a.location === location, b.location === location],
    [a.hasCompatibleHistory === true, b.hasCompatibleHistory === true],
  ];
  for (const [aWins, bWins] of booleans) {
    if (aWins !== bWins) return aWins ? -1 : 1;
  }

  const priority = (a.selectionPriority ?? 100) - (b.selectionPriority ?? 100);
  if (priority !== 0) return priority;
  return (a.exerciseSlug ?? a.exerciseId).localeCompare(b.exerciseSlug ?? b.exerciseId);
}

/**
 * Resolves the exercise variant to prescribe for a movement-pattern
 * equivalence group at a given location, per the explicit gym/home
 * equivalence mappings in docs/EXERCISE_LIBRARY.md. Never invents a
 * substitution outside the mapped group.
 */
export function resolveVariant(
  variants: VariantOption[],
  equivalenceGroup: string,
  location: Location,
  wantShort: boolean,
  rotationIndex = 0,
): VariantOption | null {
  const inGroup = variants.filter(
    (v) =>
      v.equivalenceGroup === equivalenceGroup &&
      (v.location === location || v.location === "either") &&
      v.activeForNewPlans !== false &&
      v.safetyEligible !== false,
  );
  if (inGroup.length === 0) return null;
  const withoutAvoided = inGroup.filter((variant) => variant.preference !== "avoid");
  // Avoid is a preference, not an unsafe hard block. If every valid option
  // is avoided, keep the workout executable and explain the fallback.
  const eligible = withoutAvoided.length > 0 ? withoutAvoided : inGroup;
  const ordered = [...eligible].sort((a, b) => compareVariants(a, b, location, wantShort));
  const persisted = ordered.find((variant) => variant.isPersistedSelection);
  if (persisted) return persisted;

  // Rotation is deliberately limited to explicitly approved accessories.
  // Preserve the preferred short/full and exact-location characteristics of
  // the highest-ranked option so variety can never change workout intent.
  const best = ordered[0]!;
  const rotating = ordered.filter(
    (variant) =>
      variant.rotationEligible === true &&
      variant.isShortOption === best.isShortOption &&
      (variant.location === location) === (best.location === location),
  );
  if (best.rotationEligible === true && rotating.length > 1) {
    return rotating[rotationIndex % rotating.length]!;
  }
  return best;
}

export interface TemplateItem {
  ordinal: number;
  equivalenceGroup: string;
  isOptional: boolean;
  isFinisher: boolean;
  includeInShortVersion: boolean;
  setCount: number;
  repRangeLow: number;
  repRangeHigh: number;
  restSeconds: number;
}

/**
 * Short version keeps warmup/safety work and the highest-priority movement
 * patterns; optional accessories and the finisher are removed first.
 */
export function selectTemplateItemsForVersion(items: TemplateItem[], wantShort: boolean): TemplateItem[] {
  const selected = wantShort ? items.filter((i) => i.includeInShortVersion) : items;
  return [...selected].sort((a, b) => a.ordinal - b.ordinal);
}

export interface ResolvedWorkoutItem {
  ordinal: number;
  variant: VariantOption;
  setCount: number;
  repRangeLow: number;
  repRangeHigh: number;
  restSeconds: number;
  isOptional: boolean;
  isFinisher: boolean;
  selectionReasonCode: SelectionReasonCode;
}

export type SelectionReasonCode =
  | "block_consistency"
  | "accessory_rotation"
  | "short_option"
  | "location_equivalent"
  | "default_selection"
  | "user_preference"
  | "preference_unavailable"
  | "manual_substitution";

/**
 * Builds the concrete, location-aware strength workout from a template.
 * Converting location or shortening the workout preserves movement
 * pattern, muscle groups, and difficulty intent — it never invents
 * unrelated substitutions.
 */
export function buildStrengthWorkout(
  items: TemplateItem[],
  variants: VariantOption[],
  location: Location,
  wantShort: boolean,
  rotationIndex = 0,
): ResolvedWorkoutItem[] {
  const selectedItems = selectTemplateItemsForVersion(items, wantShort);
  const resolved: ResolvedWorkoutItem[] = [];
  for (const item of selectedItems) {
    const candidates = variants.filter(
      (candidate) =>
        candidate.equivalenceGroup === item.equivalenceGroup &&
        (candidate.location === location || candidate.location === "either") &&
        candidate.activeForNewPlans !== false &&
        candidate.safetyEligible !== false,
    );
    const variant = resolveVariant(variants, item.equivalenceGroup, location, wantShort, rotationIndex);
    if (!variant) continue;
    const rotationCandidates = candidates.filter((candidate) => candidate.rotationEligible);
    const selectionReasonCode: SelectionReasonCode = variant.isPersistedSelection
      ? "block_consistency"
      : variant.preference === "prefer"
        ? "user_preference"
        : variant.preference === "avoid"
          ? "preference_unavailable"
      : variant.rotationEligible === true && rotationCandidates.length > 1
        ? "accessory_rotation"
        : wantShort && variant.isShortOption
          ? "short_option"
          : variant.location === location
            ? "location_equivalent"
            : "default_selection";
    resolved.push({
      ordinal: item.ordinal,
      variant,
      setCount: item.setCount,
      repRangeLow: item.repRangeLow,
      repRangeHigh: item.repRangeHigh,
      restSeconds: item.restSeconds,
      isOptional: item.isOptional,
      isFinisher: item.isFinisher,
      selectionReasonCode,
    });
  }
  return resolved;
}
