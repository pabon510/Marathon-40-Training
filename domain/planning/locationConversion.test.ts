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

  it("is deterministic regardless of database/input row order", () => {
    const choices: VariantOption[] = [
      { id: "z", exerciseId: "z", exerciseSlug: "zeta", location: "home", equivalenceGroup: "squat", isShortOption: false, selectionPriority: 20 },
      { id: "a", exerciseId: "a", exerciseSlug: "alpha", location: "home", equivalenceGroup: "squat", isShortOption: false, selectionPriority: 10 },
      { id: "e", exerciseId: "e", exerciseSlug: "either", location: "either", equivalenceGroup: "squat", isShortOption: false, selectionPriority: 1 },
    ];
    expect(resolveVariant(choices, "squat", "home", false)?.id).toBe("a");
    expect(resolveVariant([...choices].reverse(), "squat", "home", false)?.id).toBe("a");
  });

  it("prefers exact location over an either variant even when either has a lower numeric priority", () => {
    const choices: VariantOption[] = [
      { id: "either", exerciseId: "either", location: "either", equivalenceGroup: "squat", isShortOption: false, selectionPriority: 1 },
      { id: "home", exerciseId: "home", location: "home", equivalenceGroup: "squat", isShortOption: false, selectionPriority: 100 },
    ];
    expect(resolveVariant(choices, "squat", "home", false)?.id).toBe("home");
  });

  it("honours a persisted block choice before history and numeric priority", () => {
    const choices: VariantOption[] = [
      { id: "history", exerciseId: "history", location: "gym", equivalenceGroup: "pull", isShortOption: false, selectionPriority: 1, hasCompatibleHistory: true },
      { id: "persisted", exerciseId: "persisted", location: "gym", equivalenceGroup: "pull", isShortOption: false, selectionPriority: 100, isPersistedSelection: true },
    ];
    expect(resolveVariant(choices, "pull", "gym", false)?.id).toBe("persisted");
  });

  it("rotates only explicitly eligible accessories at a block boundary", () => {
    const choices: VariantOption[] = [
      { id: "primary", exerciseId: "primary", location: "gym", equivalenceGroup: "hip", isShortOption: false, selectionPriority: 1 },
      { id: "cable", exerciseId: "cable", location: "gym", equivalenceGroup: "hip", isShortOption: false, selectionPriority: 10, rotationEligible: true },
      { id: "machine", exerciseId: "machine", location: "gym", equivalenceGroup: "hip", isShortOption: false, selectionPriority: 20, rotationEligible: true },
    ];
    // A non-rotating primary remains the winner; approved accessories do
    // not displace a primary merely to create novelty.
    expect(resolveVariant(choices, "hip", "gym", false, 1)?.id).toBe("primary");

    const accessories = choices.slice(1);
    expect(resolveVariant(accessories, "hip", "gym", false, 0)?.id).toBe("cable");
    expect(resolveVariant(accessories, "hip", "gym", false, 1)?.id).toBe("machine");
  });

  it("a persisted selection wins even when its numeric priority is lower", () => {
    const choices: VariantOption[] = [
      { id: "new", exerciseId: "new", location: "gym", equivalenceGroup: "hip", isShortOption: false, selectionPriority: 1, rotationEligible: true },
      { id: "saved", exerciseId: "saved", location: "either", equivalenceGroup: "hip", isShortOption: false, selectionPriority: 99, isPersistedSelection: true, rotationEligible: true },
    ];
    expect(resolveVariant(choices, "hip", "gym", false, 3)?.id).toBe("saved");
  });

  it("excludes inactive and safety-ineligible variants", () => {
    const choices: VariantOption[] = [
      { id: "inactive", exerciseId: "inactive", location: "gym", equivalenceGroup: "squat", isShortOption: false, activeForNewPlans: false },
      { id: "unsafe", exerciseId: "unsafe", location: "gym", equivalenceGroup: "squat", isShortOption: false, safetyEligible: false },
      { id: "allowed", exerciseId: "allowed", location: "gym", equivalenceGroup: "squat", isShortOption: false },
    ];
    expect(resolveVariant(choices, "squat", "gym", false)?.id).toBe("allowed");
  });

  it("selects a preferred exercise among otherwise valid options", () => {
    const choices: VariantOption[] = [
      { id: "default", exerciseId: "default", location: "gym", equivalenceGroup: "pull", isShortOption: false, selectionPriority: 1 },
      { id: "preferred", exerciseId: "preferred", location: "either", equivalenceGroup: "pull", isShortOption: false, selectionPriority: 100, preference: "prefer" },
    ];
    expect(resolveVariant(choices, "pull", "gym", false)?.id).toBe("preferred");
  });

  it("excludes an avoided exercise when a valid alternative exists", () => {
    const choices: VariantOption[] = [
      { id: "avoided", exerciseId: "avoided", location: "gym", equivalenceGroup: "pull", isShortOption: false, selectionPriority: 1, preference: "avoid" },
      { id: "alternative", exerciseId: "alternative", location: "gym", equivalenceGroup: "pull", isShortOption: false, selectionPriority: 20 },
    ];
    expect(resolveVariant(choices, "pull", "gym", false)?.id).toBe("alternative");
  });

  it("keeps the workout executable when every valid option is avoided", () => {
    const choices: VariantOption[] = [
      { id: "only", exerciseId: "only", location: "home", equivalenceGroup: "pull", isShortOption: false, preference: "avoid" },
    ];
    expect(resolveVariant(choices, "pull", "home", false)?.id).toBe("only");
  });

  it("never selects a preferred exercise that is safety-ineligible", () => {
    const choices: VariantOption[] = [
      { id: "unsafe", exerciseId: "unsafe", location: "gym", equivalenceGroup: "leg", isShortOption: false, preference: "prefer", safetyEligible: false },
      { id: "safe", exerciseId: "safe", location: "gym", equivalenceGroup: "leg", isShortOption: false },
    ];
    expect(resolveVariant(choices, "leg", "gym", false)?.id).toBe("safe");
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
