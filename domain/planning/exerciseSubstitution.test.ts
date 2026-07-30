import { describe, expect, it } from "vitest";
import { EXERCISES, type ExerciseContent } from "@/domain/content/exerciseLibrary";
import { buildSubstitutionCandidates } from "./exerciseSubstitution";

function exercise(
  slug: string,
  {
    pattern = "horizontal_push",
    group = "push",
    equipment = ["dumbbell"],
    metric = "reps",
    location = "gym",
    isLowerBody = false,
    substitutions = [],
  }: {
    pattern?: string;
    group?: string;
    equipment?: string[];
    metric?: "reps" | "seconds";
    location?: "gym" | "home" | "either";
    isLowerBody?: boolean;
    substitutions?: string[];
  } = {},
): ExerciseContent {
  return {
    slug,
    name: slug,
    movementPattern: pattern,
    targetMuscles: ["chest"],
    equipment,
    setup: "Setup.",
    execution: "Execute.",
    cues: ["Cue."],
    mistakes: ["Mistake."],
    stopSubstituteGuidance: "Stop if painful.",
    isLowerBody,
    allowedLoadTypes: equipment.some((item) => item.includes("machine")) ? ["machine"] : ["weighted"],
    loadBasis: "single_implement",
    defaultLoadType: equipment.some((item) => item.includes("machine")) ? "machine" : "weighted",
    repBasis: "total",
    loadingInstructions: "Record load.",
    loadPosition: "Hands",
    startLoadNote: "",
    loadIncrementLb: 5,
    metadataV2: {
      prescriptionMetric: metric,
      substitutionExerciseSlugs: substitutions,
      activeForNewPlans: true,
      legacyDisplayOnly: false,
    },
    variants: [{
      location,
      equivalenceGroup: group,
      equipmentRequirements: equipment,
      progressionMethods: ["reps"],
      contraindicationTags: [],
      isShortOption: false,
    }],
  };
}

describe("exercise substitutions", () => {
  it("offers Pallof press only vetted same-slot alternatives", () => {
    const candidates = buildSubstitutionCandidates({
      originalSlug: "pallof_press",
      location: "gym",
      reason: "different_exercise",
    });
    expect(candidates.map((candidate) => candidate.exercise.slug)).toContain("tall_kneeling_band_hold");
    expect(candidates[0]?.quality).toBe("exact");
    expect(candidates.every((candidate) => candidate.exercise.slug !== "dead_bug")).toBe(true);
  });

  it("ranks a machine option first inside the same quality tier", () => {
    const library = [
      exercise("original"),
      exercise("dumbbell"),
      exercise("machine", { equipment: ["chest press machine"] }),
    ];
    const candidates = buildSubstitutionCandidates({
      originalSlug: "original",
      location: "gym",
      reason: "prefer_machine",
      library,
    });
    expect(candidates.map((candidate) => candidate.exercise.slug)).toEqual(["machine", "dumbbell"]);
  });

  it("excludes mismatched logging metrics and unsupported locations", () => {
    const library = [
      exercise("original"),
      exercise("timed", { metric: "seconds" }),
      exercise("home_only", { location: "home" }),
      exercise("valid"),
    ];
    expect(buildSubstitutionCandidates({
      originalSlug: "original",
      location: "gym",
      reason: "different_exercise",
      library,
    }).map((candidate) => candidate.exercise.slug)).toEqual(["valid"]);
  });

  it("honors avoid preferences when another approved option exists", () => {
    const library = [exercise("original"), exercise("avoided"), exercise("valid")];
    const result = buildSubstitutionCandidates({
      originalSlug: "original",
      location: "gym",
      reason: "different_exercise",
      preferences: new Map([["avoided", "avoid"]]),
      library,
    });
    expect(result.map((candidate) => candidate.exercise.slug)).toEqual(["valid"]);
  });

  it("removes lower-body alternatives during a knee hard block", () => {
    const original = exercise("original", { isLowerBody: true });
    const lower = exercise("lower", { isLowerBody: true });
    expect(buildSubstitutionCandidates({
      originalSlug: original.slug,
      location: "gym",
      reason: "different_exercise",
      blockLowerBody: true,
      library: [original, lower],
    })).toEqual([]);
  });

  it("keeps the curated catalogue immutable", () => {
    const before = EXERCISES.length;
    buildSubstitutionCandidates({ originalSlug: "pallof_press", location: "home", reason: "different_exercise" });
    expect(EXERCISES).toHaveLength(before);
  });
});

