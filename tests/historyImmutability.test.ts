import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getExerciseLoadMetadata } from "@/domain/content/loadMetadata";
import { buildLoadRecommendation, type ExerciseExposure } from "@/domain/progression/loadRecommendation";

/**
 * Guards the constraint that fixing the load-recommendation bug must not
 * touch stored workout history: the fix lives entirely in exercise-library
 * metadata and read-time interpretation.
 */
describe("existing workout history is never modified by the recommendation pipeline", () => {
  const legacyLegPress: ExerciseExposure = Object.freeze({
    localDate: "2026-07-28",
    loadValue: 130,
    loadType: null,
    bandLevel: null,
    completedSets: 3,
    representativeReps: 10,
    difficulty: 7,
    repBasis: null,
  });

  it("recorded values survive interpretation unchanged", () => {
    const history = [legacyLegPress];
    const before = JSON.parse(JSON.stringify(history));

    buildLoadRecommendation(
      history,
      { setCount: 3, repRangeLow: 8, repRangeHigh: 12 },
      { metadata: getExerciseLoadMetadata("leg_press"), location: "gym", hasHeavierEquipmentAvailable: true },
    );

    expect(history).toEqual(before);
    expect(history[0]!.loadValue).toBe(130);
    expect(history[0]!.loadType).toBeNull();
  });

  it("throws nothing when given frozen (immutable) history", () => {
    expect(() =>
      buildLoadRecommendation(
        [legacyLegPress],
        { setCount: 3, repRangeLow: 8, repRangeHigh: 12 },
        { metadata: getExerciseLoadMetadata("leg_press"), location: "gym", hasHeavierEquipmentAvailable: true },
      ),
    ).not.toThrow();
  });

  it("the load-metadata module performs no database writes", () => {
    const source = readFileSync("domain/content/loadMetadata.ts", "utf-8");
    for (const forbidden of ["update(", "insert(", "upsert(", "delete("]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });

  it("the recommendation module performs no database writes", () => {
    const source = readFileSync("domain/progression/loadRecommendation.ts", "utf-8");
    for (const forbidden of ["update(", "insert(", "upsert(", "delete(", "supabase"]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });

  it("no migration after 0008 rewrites logged history", () => {
    // The fix ships without a data migration; if one is ever added, it must
    // not touch the tables holding logged workouts.
    const migration = readFileSync("supabase/migrations/0008_loading_and_logging_detail.sql", "utf-8");
    const lowered = migration.toLowerCase();
    expect(lowered).not.toMatch(/update\s+strength_logs/);
    expect(lowered).not.toMatch(/update\s+workout_sessions/);
    expect(lowered).not.toMatch(/delete\s+from\s+strength_logs/);
    expect(lowered).not.toMatch(/delete\s+from\s+workout_sessions/);
    expect(lowered).not.toMatch(/drop\s+table/);
  });
});
