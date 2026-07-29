import { describe, expect, it } from "vitest";
import {
  buildLoadRecommendation,
  FIRST_SESSION_STEPS,
  type ExerciseExposure,
  type ExerciseLoadContext,
  type Prescription,
} from "./loadRecommendation";

const PRESCRIPTION: Prescription = { setCount: 3, repRangeLow: 8, repRangeHigh: 12 };

function context(overrides: Partial<ExerciseLoadContext> = {}): ExerciseLoadContext {
  return {
    loadBasis: "machine_total",
    defaultLoadType: "machine",
    repBasis: "total",
    loadIncrementLb: 10,
    location: "gym",
    hasHeavierEquipmentAvailable: true,
    ...overrides,
  };
}

function exposure(overrides: Partial<ExerciseExposure> = {}): ExerciseExposure {
  return {
    localDate: "2026-07-28",
    loadValue: 130,
    loadType: "machine",
    bandLevel: null,
    completedSets: 3,
    representativeReps: 10,
    difficulty: 6,
    repBasis: "total",
    ...overrides,
  };
}

describe("buildLoadRecommendation — first session", () => {
  it("returns the load-finding protocol instead of guessing a number", () => {
    const rec = buildLoadRecommendation([], PRESCRIPTION, context());
    expect(rec.kind).toBe("first_session");
    expect(rec.recommendedLoad).toBeNull();
    expect(rec.recommendedText).toBeNull();
    expect(rec.previousText).toBeNull();
    expect(rec.firstSessionSteps).toEqual(FIRST_SESSION_STEPS);
  });

  it("names the 6-7/10 difficulty target and the 2-3 reps-in-reserve stopping point", () => {
    const rec = buildLoadRecommendation([], PRESCRIPTION, context());
    const joined = rec.firstSessionSteps.join(" ");
    expect(joined).toContain("6-7");
    expect(joined).toContain("2-3");
  });
});

describe("buildLoadRecommendation — later sessions", () => {
  it("shows previous performance and difficulty", () => {
    const rec = buildLoadRecommendation([exposure()], PRESCRIPTION, context());
    expect(rec.previousText).toContain("130 lb total");
    expect(rec.previousText).toContain("difficulty 6");
    expect(rec.previousDifficulty).toBe(6);
  });

  it("repeats the work after a single session (progression needs two)", () => {
    const rec = buildLoadRecommendation([exposure()], PRESCRIPTION, context());
    expect(rec.kind).toBe("repeat");
    expect(rec.recommendedLoad).toBe(130);
    expect(rec.explanation).toContain("two similar successful sessions");
  });

  it("matches the spec example: same load, add reps before weight", () => {
    // Two good sessions at 3x10 with room left in the 8-12 range.
    const rec = buildLoadRecommendation([exposure(), exposure()], PRESCRIPTION, context());
    expect(rec.kind).toBe("add_reps");
    expect(rec.recommendedLoad).toBe(130);
    expect(rec.recommendedText).toBe("130 lb total for 3 sets of 12");
    expect(rec.previousText).toBe("130 lb total for 3 sets of 10, difficulty 6");
    expect(rec.explanation).toContain("more reps");
  });

  it("adds the smallest practical load once at the top of the rep range twice", () => {
    const topOfRange = exposure({ representativeReps: 12 });
    const rec = buildLoadRecommendation([topOfRange, topOfRange], PRESCRIPTION, context());
    expect(rec.kind).toBe("add_load");
    expect(rec.recommendedLoad).toBe(140);
    expect(rec.explanation).toContain("+10 lb");
  });

  it("uses tempo/pause/range at home when no heavier equipment is available", () => {
    const topOfRange = exposure({ representativeReps: 12, loadValue: 25, loadType: "weighted" });
    const rec = buildLoadRecommendation(
      [topOfRange, topOfRange],
      PRESCRIPTION,
      context({ location: "home", hasHeavierEquipmentAvailable: false, loadBasis: "per_dumbbell", loadIncrementLb: 5 }),
    );
    expect(rec.kind).toBe("home_variable");
    expect(rec.recommendedLoad).toBe(25);
    expect(rec.explanation).toMatch(/tempo|pause|range/);
  });

  it("does not progress when the last session was too hard", () => {
    const hard = exposure({ representativeReps: 12, difficulty: 9 });
    const rec = buildLoadRecommendation([hard, hard], PRESCRIPTION, context());
    expect(rec.kind).toBe("repeat");
  });

  it("treats a missing difficulty as too uncertain to progress on", () => {
    const noDifficulty = exposure({ representativeReps: 12, difficulty: null });
    const rec = buildLoadRecommendation([noDifficulty, noDifficulty], PRESCRIPTION, context());
    expect(rec.kind).toBe("repeat");
  });

  it("does not progress when prescribed sets were not completed", () => {
    const partial = exposure({ completedSets: 1, representativeReps: 12 });
    const rec = buildLoadRecommendation([partial, partial], PRESCRIPTION, context());
    expect(rec.kind).toBe("repeat");
  });
});

describe("buildLoadRecommendation — load presentation", () => {
  it("labels per-hand loading rather than implying a total", () => {
    const rec = buildLoadRecommendation(
      [exposure({ loadValue: 25, loadType: "weighted" })],
      PRESCRIPTION,
      context({ loadBasis: "per_dumbbell", defaultLoadType: "weighted" }),
    );
    expect(rec.previousText).toContain("25 lb per hand");
  });

  it("says bodyweight instead of a weight for bodyweight movements", () => {
    const rec = buildLoadRecommendation(
      [exposure({ loadValue: null, loadType: "bodyweight" })],
      PRESCRIPTION,
      context({ loadBasis: "bodyweight", defaultLoadType: "bodyweight" }),
    );
    expect(rec.previousText).toContain("bodyweight");
    expect(rec.previousText).not.toContain("0 lb");
  });

  it("reports a band level rather than a weight for banded movements", () => {
    const rec = buildLoadRecommendation(
      [exposure({ loadValue: null, loadType: "band", bandLevel: "medium" })],
      PRESCRIPTION,
      context({ loadBasis: "band", defaultLoadType: "band" }),
    );
    expect(rec.previousText).toContain("medium band");
  });

  it("labels per-side reps for unilateral exercises", () => {
    const rec = buildLoadRecommendation(
      [exposure({ repBasis: "per_side" })],
      PRESCRIPTION,
      context({ repBasis: "per_side" }),
    );
    expect(rec.previousText).toContain("per side");
    expect(rec.recommendedText).toContain("per side");
  });
});
