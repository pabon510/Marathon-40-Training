import { describe, expect, it } from "vitest";
import {
  EXERCISES,
  EXERCISE_HISTORY_COMPATIBILITY,
  getExerciseMetadataV2,
} from "./exerciseLibrary";
import { resolveVariant, type VariantOption } from "@/domain/planning/locationConversion";

const bySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise]));

const LEGACY_AMBIGUOUS = [
  "hip_thrust_glute_bridge",
  "seated_leg_curl",
  "bridge_walkout",
  "cable_hip_abduction",
  "elevated_dead_bug",
  "farmer_suitcase_carry",
  "shorter_carry",
];

const PRECISE_REPLACEMENTS = [
  "bench_hip_thrust",
  "machine_seated_leg_curl",
  "machine_lying_leg_curl",
  "hamstring_bridge_walkout",
  "standing_cable_hip_abduction",
  "hip_abduction_machine",
  "machine_chest_press",
  "short_range_dead_bug",
  "farmer_carry",
  "suitcase_carry",
  "suitcase_hold",
];

function options(): VariantOption[] {
  return EXERCISES.flatMap((exercise) => {
    const metadata = getExerciseMetadataV2(exercise);
    return exercise.variants.map((variant, index) => ({
      id: `${exercise.slug}-${index}`,
      exerciseId: exercise.slug,
      exerciseSlug: exercise.slug,
      location: variant.location,
      equivalenceGroup: variant.equivalenceGroup,
      isShortOption: variant.isShortOption,
      selectionPriority: variant.selectionPriority ?? metadata.selectionPriority,
      activeForNewPlans: metadata.activeForNewPlans,
      safetyEligible: true,
    }));
  });
}

describe("phase 2 legacy preservation", () => {
  it("keeps every ambiguous legacy slug but excludes it from new plans", () => {
    for (const slug of LEGACY_AMBIGUOUS) {
      const exercise = bySlug.get(slug);
      expect(exercise, slug).toBeDefined();
      const metadata = getExerciseMetadataV2(exercise!);
      expect(metadata.activeForNewPlans, slug).toBe(false);
      expect(metadata.legacyDisplayOnly, slug).toBe(true);
    }
  });

  it("adds precise active replacements with unique slugs", () => {
    for (const slug of PRECISE_REPLACEMENTS) {
      const exercise = bySlug.get(slug);
      expect(exercise, slug).toBeDefined();
      expect(getExerciseMetadataV2(exercise!).activeForNewPlans, slug).toBe(true);
      expect(exercise!.name, slug).not.toContain("/");
    }
    expect(new Set(EXERCISES.map((exercise) => exercise.slug)).size).toBe(EXERCISES.length);
  });

  it("maps ambiguous history only for display, never numeric progression", () => {
    expect(EXERCISE_HISTORY_COMPATIBILITY.length).toBeGreaterThan(0);
    for (const edge of EXERCISE_HISTORY_COMPATIBILITY) {
      expect(bySlug.has(edge.sourceSlug), edge.sourceSlug).toBe(true);
      expect(bySlug.has(edge.targetSlug), edge.targetSlug).toBe(true);
      expect(edge.compatibilityScope, `${edge.sourceSlug} -> ${edge.targetSlug}`).toBe("display_only");
    }
  });
});

describe("phase 2 deterministic defaults", () => {
  const variants = options();

  it("uses bench hip thrust for full glute work and floor bridge for short work", () => {
    expect(resolveVariant(variants, "glutes", "gym", false)?.exerciseSlug).toBe("bench_hip_thrust");
    expect(resolveVariant(variants, "glutes", "home", true)?.exerciseSlug).toBe("floor_bridge");
  });

  it("uses precise machine and home hamstring records", () => {
    expect(resolveVariant(variants, "hamstrings", "gym", false)?.exerciseSlug).toBe("machine_seated_leg_curl");
    expect(resolveVariant(variants, "hamstrings", "home", false)?.exerciseSlug).toBe("hamstring_bridge_walkout");
  });

  it("uses cable hip abduction as the gym default and preserves the home band walk", () => {
    expect(resolveVariant(variants, "hip_abductors", "gym", false)?.exerciseSlug).toBe("standing_cable_hip_abduction");
    expect(resolveVariant(variants, "hip_abductors", "home", false)?.exerciseSlug).toBe("band_lateral_walk");
  });

  it("uses machine chest press at the gym and dumbbell bench press at home", () => {
    expect(resolveVariant(variants, "horizontal_push", "gym", false)?.exerciseSlug).toBe("machine_chest_press");
    expect(resolveVariant(variants, "horizontal_push", "home", false)?.exerciseSlug).toBe("db_bench_press");
  });

  it("uses a precise dead-bug regression for short workouts", () => {
    expect(resolveVariant(variants, "core_anti_extension", "home", true)?.exerciseSlug).toBe("short_range_dead_bug");
  });

  it("uses suitcase carry by default and suitcase hold as the short option", () => {
    expect(resolveVariant(variants, "carry", "gym", false)?.exerciseSlug).toBe("suitcase_carry");
    expect(resolveVariant(variants, "carry", "home", true)?.exerciseSlug).toBe("suitcase_hold");
  });
});
