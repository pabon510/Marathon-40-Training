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
}

function compareVariants(a: VariantOption, b: VariantOption, location: Location, wantShort: boolean): number {
  const booleans: Array<[boolean, boolean]> = [
    [wantShort ? a.isShortOption : !a.isShortOption, wantShort ? b.isShortOption : !b.isShortOption],
    [a.location === location, b.location === location],
    [a.isPersistedSelection === true, b.isPersistedSelection === true],
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
): VariantOption | null {
  const inGroup = variants.filter(
    (v) =>
      v.equivalenceGroup === equivalenceGroup &&
      (v.location === location || v.location === "either") &&
      v.activeForNewPlans !== false &&
      v.safetyEligible !== false,
  );
  if (inGroup.length === 0) return null;
  return [...inGroup].sort((a, b) => compareVariants(a, b, location, wantShort))[0]!;
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
}

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
): ResolvedWorkoutItem[] {
  const selectedItems = selectTemplateItemsForVersion(items, wantShort);
  const resolved: ResolvedWorkoutItem[] = [];
  for (const item of selectedItems) {
    const variant = resolveVariant(variants, item.equivalenceGroup, location, wantShort);
    if (!variant) continue;
    resolved.push({
      ordinal: item.ordinal,
      variant,
      setCount: item.setCount,
      repRangeLow: item.repRangeLow,
      repRangeHigh: item.repRangeHigh,
      restSeconds: item.restSeconds,
      isOptional: item.isOptional,
      isFinisher: item.isFinisher,
    });
  }
  return resolved;
}
