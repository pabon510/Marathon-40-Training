import type { Location } from "@/domain/types";

export interface VariantOption {
  id: string;
  exerciseId: string;
  location: Location | "either";
  equivalenceGroup: string;
  isShortOption: boolean;
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
    (v) => v.equivalenceGroup === equivalenceGroup && (v.location === location || v.location === "either"),
  );
  if (inGroup.length === 0) return null;

  if (wantShort) {
    const short = inGroup.find((v) => v.isShortOption);
    if (short) return short;
  }
  return inGroup.find((v) => !v.isShortOption) ?? inGroup[0]!;
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
