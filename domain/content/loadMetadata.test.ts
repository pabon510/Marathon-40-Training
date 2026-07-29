import { describe, expect, it } from "vitest";
import { EXERCISES } from "./exerciseLibrary";
import {
  allowsBodyweight,
  getExerciseLoadMetadata,
  loadedTypeFor,
  resolveHistoricalLoadType,
} from "./loadMetadata";

describe("getExerciseLoadMetadata", () => {
  it("resolves from the curated library, not the database", () => {
    const legPress = getExerciseLoadMetadata("leg_press");
    expect(legPress.loadScope).toBe("machine_total");
    expect(legPress.defaultLoadType).toBe("machine");
    expect(legPress.allowedLoadTypes).toEqual(["machine"]);
  });

  it("never falls back to bodyweight for an unknown exercise", () => {
    const unknown = getExerciseLoadMetadata("not_a_real_exercise");
    expect(unknown.defaultLoadType).not.toBe("bodyweight");
  });

  it("covers every exercise in the library", () => {
    for (const exercise of EXERCISES) {
      const metadata = getExerciseLoadMetadata(exercise.slug);
      expect(metadata.slug, exercise.slug).toBe(exercise.slug);
      expect(metadata.allowedLoadTypes.length, exercise.slug).toBeGreaterThan(0);
      expect(metadata.allowedLoadTypes, exercise.slug).toContain(metadata.defaultLoadType);
    }
  });
});

describe("allowsBodyweight", () => {
  it("is false for loaded machine and dumbbell exercises", () => {
    for (const slug of ["leg_press", "lat_pulldown", "db_rdl", "db_bench_press", "seated_cable_row"]) {
      expect(allowsBodyweight(getExerciseLoadMetadata(slug)), slug).toBe(false);
    }
  });

  it("is true for bodyweight and optionally-loaded exercises", () => {
    for (const slug of ["high_incline_pushup", "plank", "step_up", "hip_thrust_glute_bridge"]) {
      expect(allowsBodyweight(getExerciseLoadMetadata(slug)), slug).toBe(true);
    }
  });
});

describe("loadedTypeFor", () => {
  it("returns the default when it already implies external load", () => {
    expect(loadedTypeFor(getExerciseLoadMetadata("leg_press"))).toBe("machine");
    expect(loadedTypeFor(getExerciseLoadMetadata("db_rdl"))).toBe("weighted");
  });

  it("returns the loaded alternative for exercises that default to bodyweight", () => {
    expect(loadedTypeFor(getExerciseLoadMetadata("step_up"))).toBe("weighted");
    expect(loadedTypeFor(getExerciseLoadMetadata("clamshell"))).toBe("band");
  });
});

describe("resolveHistoricalLoadType", () => {
  const legPress = getExerciseLoadMetadata("leg_press");
  const stepUp = getExerciseLoadMetadata("step_up");
  const pushup = getExerciseLoadMetadata("high_incline_pushup");

  it("infers machine from a numeric load when load_type is null", () => {
    expect(resolveHistoricalLoadType(130, null, legPress)).toBe("machine");
  });

  it("infers machine from a numeric load when the column is entirely absent", () => {
    expect(resolveHistoricalLoadType(130, undefined, legPress)).toBe("machine");
  });

  it("overrides a contradictory bodyweight label when a real load was recorded", () => {
    expect(resolveHistoricalLoadType(130, "bodyweight", legPress)).toBe("machine");
  });

  it("honours an explicit valid load type", () => {
    expect(resolveHistoricalLoadType(25, "weighted", stepUp)).toBe("weighted");
  });

  it("falls back to the exercise default when there is no load at all", () => {
    expect(resolveHistoricalLoadType(null, null, stepUp)).toBe("bodyweight");
    expect(resolveHistoricalLoadType(null, null, legPress)).toBe("machine");
  });

  it("keeps bodyweight for a genuinely bodyweight exercise", () => {
    expect(resolveHistoricalLoadType(null, "bodyweight", pushup)).toBe("bodyweight");
    expect(resolveHistoricalLoadType(null, null, pushup)).toBe("bodyweight");
  });

  it("rejects a load type the exercise does not permit", () => {
    // A stale/incorrect "machine" label on a pushup falls back to what the
    // exercise actually supports rather than being trusted.
    expect(resolveHistoricalLoadType(null, "machine", pushup)).toBe("bodyweight");
  });

  it("treats a zero load as no load rather than as a weight", () => {
    expect(resolveHistoricalLoadType(0, null, stepUp)).toBe("bodyweight");
  });
});
