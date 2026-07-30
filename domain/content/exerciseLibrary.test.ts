import { describe, expect, it } from "vitest";
import { EXERCISES, TEMPLATES, getExerciseMetadataV2 } from "./exerciseLibrary";

describe("exercise library content depth", () => {
  it("every exercise has setup, execution, 2-3 cues, mistakes, muscles, and stop/substitute guidance", () => {
    for (const ex of EXERCISES) {
      expect(ex.setup.length, `${ex.slug} setup`).toBeGreaterThan(10);
      expect(ex.execution.length, `${ex.slug} execution`).toBeGreaterThan(10);
      expect(ex.cues.length, `${ex.slug} cues`).toBeGreaterThanOrEqual(2);
      expect(ex.cues.length, `${ex.slug} cues`).toBeLessThanOrEqual(3);
      expect(ex.mistakes.length, `${ex.slug} mistakes`).toBeGreaterThanOrEqual(2);
      expect(ex.targetMuscles.length, `${ex.slug} muscles`).toBeGreaterThan(0);
      expect(ex.stopSubstituteGuidance.length, `${ex.slug} stop/substitute`).toBeGreaterThan(10);
    }
  });

  it("every lower-body exercise explicitly instructs stopping/substituting on increased knee discomfort", () => {
    for (const ex of EXERCISES.filter((e) => e.isLowerBody)) {
      expect(ex.stopSubstituteGuidance.toLowerCase()).toContain("knee");
    }
  });

  it("has no Smith-machine exercises", () => {
    const text = JSON.stringify(EXERCISES).toLowerCase();
    expect(text).not.toContain("smith machine");
  });

  it("has no adjustable-kettlebell swings", () => {
    const text = JSON.stringify(EXERCISES).toLowerCase();
    expect(text).not.toMatch(/kettlebell swing/);
  });

  it("every exercise has at least one variant", () => {
    for (const ex of EXERCISES) {
      expect(ex.variants.length).toBeGreaterThan(0);
    }
  });
});

describe("exercise loading semantics", () => {
  it("every exercise states explicitly how the load number is read", () => {
    for (const ex of EXERCISES) {
      expect(ex.loadingInstructions.length, `${ex.slug} loadingInstructions`).toBeGreaterThan(10);
      expect(ex.loadPosition.length, `${ex.slug} loadPosition`).toBeGreaterThan(0);
      expect(ex.loadIncrementLb, `${ex.slug} loadIncrementLb`).toBeGreaterThan(0);
    }
  });

  it("per-hand and per-dumbbell exercises say so, rather than implying a total", () => {
    for (const ex of EXERCISES.filter((e) => e.loadBasis === "per_dumbbell" || e.loadBasis === "per_hand")) {
      expect(ex.loadingInstructions.toLowerCase(), `${ex.slug}`).toMatch(/per hand|one dumbbell|per dumbbell/);
    }
  });

  it("machine exercises specify total machine weight", () => {
    for (const ex of EXERCISES.filter((e) => e.loadBasis === "machine_total")) {
      expect(ex.loadingInstructions.toLowerCase(), `${ex.slug}`).toContain("total");
    }
  });

  it("unilateral exercises are marked per_side so reps are not ambiguous", () => {
    const expectedPerSide = [
      "step_up",
      "assisted_split_squat",
      "one_arm_db_row",
      "half_kneeling_single_arm_press",
      "clamshell",
      "cable_hip_abduction",
      "vertical_pull_row_substitute",
      "pallof_press",
      "tall_kneeling_band_hold",
    ];
    for (const slug of expectedPerSide) {
      const ex = EXERCISES.find((e) => e.slug === slug);
      expect(ex, `${slug} should exist`).toBeDefined();
      expect(ex!.repBasis, `${slug} repBasis`).toBe("per_side");
    }
  });

  it("per-side exercises restate that reps are per side in their loading instructions", () => {
    for (const ex of EXERCISES.filter((e) => e.repBasis === "per_side")) {
      expect(ex.loadingInstructions.toLowerCase(), `${ex.slug}`).toMatch(/per leg|per side/);
    }
  });

  it("step-ups tell you to start with bodyweight and add load only when knee comfort is good", () => {
    const stepUp = EXERCISES.find((e) => e.slug === "step_up")!;
    expect(stepUp.defaultLoadType).toBe("bodyweight");
    expect(stepUp.startLoadNote.toLowerCase()).toContain("bodyweight");
    expect(stepUp.startLoadNote.toLowerCase()).toContain("knee");
  });

  it("bodyweight and band exercises do not default to a weighted load type", () => {
    for (const ex of EXERCISES.filter((e) => e.loadBasis === "bodyweight")) {
      expect(ex.defaultLoadType, `${ex.slug}`).toBe("bodyweight");
    }
    for (const ex of EXERCISES.filter((e) => e.loadBasis === "band")) {
      expect(["band", "bodyweight"], `${ex.slug}`).toContain(ex.defaultLoadType);
    }
  });
});

describe("phase-1 V2 metadata foundations", () => {
  it("normalizes every existing exercise conservatively", () => {
    for (const exercise of EXERCISES) {
      const metadata = getExerciseMetadataV2(exercise);
      expect(metadata.familySlug.length, exercise.slug).toBeGreaterThan(0);
      expect(["reps", "seconds", "distance_feet", "steps", "breaths"], exercise.slug).toContain(
        metadata.prescriptionMetric,
      );
      expect(metadata.historyCompatibility, exercise.slug).toBe("exact_only");
      if (metadata.rotationEligible) {
        expect(metadata.programmingRole, exercise.slug).toBe("accessory");
      }
      expect(typeof metadata.activeForNewPlans, exercise.slug).toBe("boolean");
    }
  });

  it("never marks a lower-body exercise as a safety alternative by default", () => {
    for (const exercise of EXERCISES.filter((e) => e.isLowerBody)) {
      expect(getExerciseMetadataV2(exercise).safetyAlternativeEligible, exercise.slug).toBe(false);
    }
  });

  it("derives side mode from the existing rep basis", () => {
    for (const exercise of EXERCISES) {
      expect(getExerciseMetadataV2(exercise).sideMode, exercise.slug).toBe(
        exercise.repBasis === "per_side" ? "per_side" : "bilateral",
      );
    }
  });
});

describe("strength templates reference valid equivalence groups", () => {
  const allGroups = new Set(EXERCISES.flatMap((e) => e.variants.map((v) => v.equivalenceGroup)));

  it("every template item's equivalence group has at least one matching exercise variant", () => {
    for (const template of TEMPLATES) {
      for (const item of template.items) {
        expect(allGroups.has(item.equivalenceGroup), `${template.slug} item ${item.ordinal} group ${item.equivalenceGroup}`).toBe(true);
      }
    }
  });

  it("every equivalence group used by upper_core_safety excludes loaded lower-body movement groups", () => {
    const lowerBodyGroups = new Set(
      EXERCISES.filter((e) => e.isLowerBody).flatMap((e) => e.variants.map((v) => v.equivalenceGroup)),
    );
    const safetyTemplate = TEMPLATES.find((t) => t.slug === "upper_core_safety")!;
    for (const item of safetyTemplate.items) {
      expect(lowerBodyGroups.has(item.equivalenceGroup)).toBe(false);
    }
  });

  it("each template has a duration and at least 3 items", () => {
    for (const template of TEMPLATES) {
      expect(template.durationMinutes).toBeGreaterThan(0);
      expect(template.items.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("template item ordinals are unique per template", () => {
    for (const template of TEMPLATES) {
      const ordinals = template.items.map((i) => i.ordinal);
      expect(new Set(ordinals).size).toBe(ordinals.length);
    }
  });
});
