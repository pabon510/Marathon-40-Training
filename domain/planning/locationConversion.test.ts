import { describe, expect, it } from "vitest";
import { buildStrengthWorkout, resolveVariant, selectTemplateItemsForVersion, type TemplateItem, type VariantOption } from "./locationConversion";

const variants: VariantOption[] = [
  { id: "squat-gym", exerciseId: "goblet-or-leg-press", location: "gym", equivalenceGroup: "squat", isShortOption: false },
  { id: "squat-home", exerciseId: "goblet-squat", location: "home", equivalenceGroup: "squat", isShortOption: false },
  { id: "squat-short", exerciseId: "bench-box-squat", location: "either", equivalenceGroup: "squat", isShortOption: true },
  { id: "hinge-gym", exerciseId: "db-rdl", location: "gym", equivalenceGroup: "hinge", isShortOption: false },
  { id: "hinge-home", exerciseId: "db-rdl-home", location: "home", equivalenceGroup: "hinge", isShortOption: false },
];

describe("resolveVariant", () => {
  it("resolves the gym variant at the gym", () => {
    expect(resolveVariant(variants, "squat", "gym", false)?.id).toBe("squat-gym");
  });

  it("resolves the home variant at home", () => {
    expect(resolveVariant(variants, "squat", "home", false)?.id).toBe("squat-home");
  });

  it("prefers the short 'either' option when a shorter version is requested", () => {
    expect(resolveVariant(variants, "squat", "home", true)?.id).toBe("squat-short");
  });

  it("falls back to the full variant when no short option exists for the group", () => {
    expect(resolveVariant(variants, "hinge", "home", true)?.id).toBe("hinge-home");
  });

  it("returns null for an unknown equivalence group", () => {
    expect(resolveVariant(variants, "unknown-group", "home", false)).toBeNull();
  });
});

describe("selectTemplateItemsForVersion", () => {
  const items: TemplateItem[] = [
    { ordinal: 1, equivalenceGroup: "squat", isOptional: false, isFinisher: false, includeInShortVersion: true, setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90 },
    { ordinal: 2, equivalenceGroup: "hinge", isOptional: false, isFinisher: false, includeInShortVersion: true, setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90 },
    { ordinal: 3, equivalenceGroup: "carry", isOptional: true, isFinisher: true, includeInShortVersion: false, setCount: 2, repRangeLow: 1, repRangeHigh: 1, restSeconds: 60 },
  ];

  it("full version keeps every item including optional/finisher", () => {
    expect(selectTemplateItemsForVersion(items, false)).toHaveLength(3);
  });

  it("short version drops the optional finisher first", () => {
    const short = selectTemplateItemsForVersion(items, true);
    expect(short).toHaveLength(2);
    expect(short.some((i) => i.isFinisher)).toBe(false);
  });
});

describe("buildStrengthWorkout", () => {
  const items: TemplateItem[] = [
    { ordinal: 1, equivalenceGroup: "squat", isOptional: false, isFinisher: false, includeInShortVersion: true, setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90 },
    { ordinal: 2, equivalenceGroup: "hinge", isOptional: false, isFinisher: false, includeInShortVersion: true, setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90 },
  ];

  it("builds a full home workout using home variants", () => {
    const workout = buildStrengthWorkout(items, variants, "home", false);
    expect(workout.map((w) => w.variant.id)).toEqual(["squat-home", "hinge-home"]);
  });

  it("builds a short workout preferring short options where they exist", () => {
    const workout = buildStrengthWorkout(items, variants, "home", true);
    expect(workout.find((w) => w.ordinal === 1)?.variant.id).toBe("squat-short");
    expect(workout.find((w) => w.ordinal === 2)?.variant.id).toBe("hinge-home");
  });
});
