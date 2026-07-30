import { describe, expect, it } from "vitest";
import { EXERCISES, TEMPLATES, getExerciseMetadataV2 } from "./exerciseLibrary";
import { metricResultLabel, metricUnit } from "./prescriptionMetric";

const bySlug = (slug: string) => EXERCISES.find((exercise) => exercise.slug === slug)!;

describe("phase-3 runner-support library", () => {
  it("provides deterministic gym and home options for straight- and bent-knee calf work", () => {
    const variants = EXERCISES.flatMap((exercise) =>
      exercise.variants.map((variant) => ({ exercise, variant })),
    );
    for (const group of ["calf_straight", "calf_bent"]) {
      expect(variants.some(({ variant }) => variant.equivalenceGroup === group && variant.location === "gym")).toBe(true);
      expect(variants.some(({ variant }) => variant.equivalenceGroup === group && variant.location === "home")).toBe(true);
    }
  });

  it("adds calf work without adding another card to the two default strength templates", () => {
    const strengthA = TEMPLATES.find((template) => template.slug === "strength_a")!;
    const strengthB = TEMPLATES.find((template) => template.slug === "strength_b")!;
    expect(strengthA.items).toHaveLength(8);
    expect(strengthB.items).toHaveLength(8);
    expect(strengthA.items[7]!.equivalenceGroup).toBe("calf_straight");
    expect(strengthB.items[7]!.equivalenceGroup).toBe("calf_bent");
  });

  it("keeps warmups defined but out of the default logged workout cards", () => {
    expect(getExerciseMetadataV2(bySlug("ankle_rock")).programmingRole).toBe("warmup");
    expect(getExerciseMetadataV2(bySlug("hip_hinge_drill")).programmingRole).toBe("warmup");
    expect(TEMPLATES.flatMap((template) => template.items).some((item) => item.equivalenceGroup === "ankle_warmup")).toBe(false);
    expect(TEMPLATES.flatMap((template) => template.items).some((item) => item.equivalenceGroup === "hinge_warmup")).toBe(false);
  });

  it("defines non-rep metrics for holds, carries, and lateral walks", () => {
    expect(getExerciseMetadataV2(bySlug("plank")).prescriptionMetric).toBe("seconds");
    expect(getExerciseMetadataV2(bySlug("isometric_bridge")).prescriptionMetric).toBe("seconds");
    expect(getExerciseMetadataV2(bySlug("farmer_carry")).prescriptionMetric).toBe("distance_feet");
    expect(getExerciseMetadataV2(bySlug("suitcase_hold")).prescriptionMetric).toBe("seconds");
    expect(getExerciseMetadataV2(bySlug("band_lateral_walk")).prescriptionMetric).toBe("steps");
  });
});

describe("metric-specific logging labels", () => {
  it("uses explicit units and side semantics", () => {
    expect(metricUnit("seconds")).toBe("sec");
    expect(metricUnit("distance_feet")).toBe("ft");
    expect(metricResultLabel("steps", "per_side")).toBe("Steps per side");
    expect(metricResultLabel("reps", "total")).toBe("Reps per set");
  });
});
