import { describe, expect, it } from "vitest";
import { EXERCISES, getExerciseMetadataV2 } from "./exerciseLibrary";
import { buildExerciseLibraryEntries, filterExerciseLibrary } from "./exerciseLibraryBrowser";
import { RECOVERY_MOVEMENTS } from "./recoveryMovementLibrary";

describe("exercise library browser catalogue", () => {
  const entries = buildExerciseLibraryEntries();

  it("shows every active precise record and hides display-only legacy rows", () => {
    const expected = EXERCISES.filter((exercise) => {
      const metadata = getExerciseMetadataV2(exercise);
      return metadata.activeForNewPlans && !metadata.legacyDisplayOnly;
    });
    expect(entries).toHaveLength(expected.length + RECOVERY_MOVEMENTS.length);
    expect(entries.some((entry) => entry.slug === "farmer_suitcase_carry")).toBe(false);
    expect(entries.some((entry) => entry.slug === "farmer_carry")).toBe(true);
  });

  it("includes searchable illustrated recovery movements", () => {
    const filtered = filterExerciseLibrary(entries, {
      query: "figure four",
      location: "home",
      movementPattern: "",
      equipment: "yoga mat",
      targetMuscle: "",
    });
    expect(filtered.map((entry) => entry.slug)).toEqual(["supine_figure_four"]);
    expect(filtered[0]).toMatchObject({ category: "recovery", preferenceEligible: false });
    expect(filtered[0]?.referenceImagePath).toContain("supine-figure-four.png");
  });

  it("resolves relationship slugs to user-facing names", () => {
    const cable = entries.find((entry) => entry.slug === "standing_cable_hip_abduction")!;
    expect(cable.substitutionNames).toContain("Hip abduction machine");
    expect(cable.substitutionNames).toContain("Band lateral walk");
  });

  it("filters by text, location, movement, equipment, and muscle", () => {
    const filtered = filterExerciseLibrary(entries, {
      query: "calf",
      location: "home",
      movementPattern: "calf_bent",
      equipment: "bench",
      targetMuscle: "soleus",
    });
    expect(filtered.map((entry) => entry.slug)).toEqual(["seated_dumbbell_calf_raise"]);
  });

  it("treats either-location exercises as available at both locations", () => {
    for (const location of ["gym", "home"] as const) {
      const filtered = filterExerciseLibrary(entries, {
        query: "tibialis",
        location,
        movementPattern: "",
        equipment: "",
        targetMuscle: "",
      });
      expect(filtered.some((entry) => entry.slug === "tibialis_raise")).toBe(true);
    }
  });
});
