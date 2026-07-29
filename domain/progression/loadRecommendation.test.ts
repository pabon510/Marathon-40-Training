import { describe, expect, it } from "vitest";
import { getExerciseLoadMetadata } from "@/domain/content/loadMetadata";
import {
  buildLoadRecommendation,
  FIRST_SESSION_STEPS,
  type ExerciseExposure,
  type ExerciseLoadContext,
  type Prescription,
} from "./loadRecommendation";

const PRESCRIPTION: Prescription = { setCount: 3, repRangeLow: 8, repRangeHigh: 12 };

function context(slug: string, overrides: Partial<ExerciseLoadContext> = {}): ExerciseLoadContext {
  return {
    metadata: getExerciseLoadMetadata(slug),
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
    painIncreased: false,
    formFailed: false,
    recoveryAcceptable: true,
    ...overrides,
  };
}

describe("REGRESSION: historical load takes priority over null/stale load_type", () => {
  // The reported bug: a leg press logged at 130 lb before load_type existed
  // rendered as "bodyweight", because migration 0008 defaulted the exercise
  // row's load metadata to bodyweight.
  const legacyLegPress = exposure({ loadValue: 130, loadType: null, difficulty: 7 });

  it("a leg press log of 130 lb with null load_type displays as 130 lb machine weight", () => {
    const rec = buildLoadRecommendation([legacyLegPress], PRESCRIPTION, context("leg_press"));
    expect(rec.previousText).toContain("130 lb");
    expect(rec.previousText).not.toContain("bodyweight");
    expect(rec.recommendedLoadType).toBe("machine");
  });

  it("produces exactly the expected leg press guidance", () => {
    const rec = buildLoadRecommendation([legacyLegPress], PRESCRIPTION, context("leg_press"));
    expect(rec.recommendedText).toBe("130 lb for 3 sets of 8 to 12");
    expect(rec.previousText).toBe("130 lb for 3 sets of 10, difficulty 7");
    expect(rec.explanation).toBe(
      "Repeat the same load. Progression requires two similar successful sessions.",
    );
  });

  it("does not mutate the historical exposure it was given", () => {
    const original = exposure({ loadValue: 130, loadType: null });
    const snapshot = JSON.parse(JSON.stringify(original));
    buildLoadRecommendation([original], PRESCRIPTION, context("leg_press"));
    expect(original).toEqual(snapshot);
    expect(original.loadValue).toBe(130);
    expect(original.loadType).toBeNull();
  });

  it("keeps the recorded numeric load even when load_type wrongly says bodyweight", () => {
    const contradictory = exposure({ loadValue: 130, loadType: "bodyweight" });
    const rec = buildLoadRecommendation([contradictory], PRESCRIPTION, context("leg_press"));
    expect(rec.previousText).toContain("130 lb");
    expect(rec.previousText).not.toContain("bodyweight");
  });
});

describe("REGRESSION: loaded exercises never recommend bodyweight", () => {
  const loadedSlugs = [
    "leg_press",
    "seated_cable_row",
    "lat_pulldown",
    "cable_hip_abduction",
    "seated_leg_curl",
    "db_bench_press",
    "db_rdl",
    "db_shoulder_press",
    "goblet_squat",
    "one_arm_db_row",
    "farmer_suitcase_carry",
  ];

  it("machine and dumbbell exercises never allow a bodyweight load type", () => {
    for (const slug of loadedSlugs) {
      const metadata = getExerciseLoadMetadata(slug);
      expect(metadata.allowedLoadTypes, slug).not.toContain("bodyweight");
      expect(metadata.defaultLoadType, slug).not.toBe("bodyweight");
    }
  });

  it("machine chest press style exercises never recommend bodyweight, with or without history", () => {
    // The curated library's gym horizontal-push movement.
    const slug = "db_bench_press";
    const firstSession = buildLoadRecommendation([], PRESCRIPTION, context(slug));
    expect(firstSession.recommendedLoadType).not.toBe("bodyweight");
    expect(firstSession.firstSessionProtocol).not.toContain("bodyweight");

    const withHistory = buildLoadRecommendation(
      [exposure({ loadValue: 40, loadType: null })],
      PRESCRIPTION,
      context(slug),
    );
    expect(withHistory.previousText).not.toContain("bodyweight");
    expect(withHistory.recommendedText).not.toContain("bodyweight");
  });

  it("no loaded exercise ever produces a bodyweight recommendation on a first session", () => {
    for (const slug of loadedSlugs) {
      const rec = buildLoadRecommendation([], PRESCRIPTION, context(slug));
      expect(rec.recommendedLoadType, slug).not.toBe("bodyweight");
    }
  });
});

describe("first-session guidance", () => {
  it("a first-time machine exercise gives a machine-weight selection protocol", () => {
    const rec = buildLoadRecommendation([], PRESCRIPTION, context("leg_press"));
    expect(rec.kind).toBe("first_session");
    expect(rec.recommendedLoad).toBeNull();
    expect(rec.recommendedText).toBeNull();
    expect(rec.firstSessionProtocol).toBe(
      "Select a starting machine weight that allows 8 to 12 controlled reps at difficulty 6 to 7, with approximately 2 to 3 good reps remaining.",
    );
  });

  it("a first-time dumbbell exercise shows load-selection guidance, not bodyweight", () => {
    const rec = buildLoadRecommendation([], PRESCRIPTION, context("db_rdl"));
    expect(rec.kind).toBe("first_session");
    expect(rec.recommendedLoad).toBeNull();
    expect(rec.firstSessionProtocol).toContain("dumbbell weight");
    expect(rec.firstSessionProtocol).not.toContain("bodyweight");
    expect(rec.recommendedLoadType).toBe("weighted");
  });

  it("never shows an exact recommended load without prior data", () => {
    for (const slug of ["leg_press", "db_rdl", "step_up", "high_incline_pushup"]) {
      const rec = buildLoadRecommendation([], PRESCRIPTION, context(slug));
      expect(rec.recommendedLoad, slug).toBeNull();
      expect(rec.recommendedText, slug).toBeNull();
    }
  });

  it("still includes the general load-finding steps", () => {
    const rec = buildLoadRecommendation([], PRESCRIPTION, context("leg_press"));
    expect(rec.firstSessionSteps).toEqual(FIRST_SESSION_STEPS);
  });
});

describe("bodyweight is recommended only where the exercise allows it", () => {
  it("pushups correctly recommend bodyweight", () => {
    const metadata = getExerciseLoadMetadata("high_incline_pushup");
    expect(metadata.allowedLoadTypes).toEqual(["bodyweight"]);

    const first = buildLoadRecommendation([], PRESCRIPTION, context("high_incline_pushup"));
    expect(first.recommendedLoadType).toBe("bodyweight");
    expect(first.firstSessionProtocol).toContain("bodyweight");

    const withHistory = buildLoadRecommendation(
      [exposure({ loadValue: null, loadType: "bodyweight" })],
      PRESCRIPTION,
      context("high_incline_pushup"),
    );
    expect(withHistory.previousText).toContain("bodyweight");
  });

  it("planks and dead bugs are bodyweight-only", () => {
    for (const slug of ["plank", "dead_bug", "floor_bridge"]) {
      expect(getExerciseLoadMetadata(slug).allowedLoadTypes, slug).toEqual(["bodyweight"]);
    }
  });
});

describe("step-ups start bodyweight and later carry load per hand", () => {
  it("default to bodyweight with no history", () => {
    const metadata = getExerciseLoadMetadata("step_up");
    expect(metadata.allowedLoadTypes).toContain("bodyweight");
    expect(metadata.allowedLoadTypes).toContain("weighted");
    expect(metadata.defaultLoadType).toBe("bodyweight");

    const rec = buildLoadRecommendation([], PRESCRIPTION, context("step_up"));
    expect(rec.recommendedLoadType).toBe("bodyweight");
    expect(rec.firstSessionProtocol).toContain("bodyweight");
  });

  it("once dumbbells are used, the recommendation states weight per hand and reps per side", () => {
    const rec = buildLoadRecommendation(
      [exposure({ loadValue: 25, loadType: "weighted", repBasis: "per_side", representativeReps: 8 })],
      PRESCRIPTION,
      context("step_up"),
    );
    expect(rec.previousText).toContain("25 lb per hand");
    expect(rec.previousText).toContain("per side");
    expect(rec.recommendedText).toContain("25 lb per hand");
    expect(rec.recommendedText).toContain("per side");
  });
});

describe("load scope is preserved in the text", () => {
  it("per-dumbbell exercises say per dumbbell", () => {
    const rec = buildLoadRecommendation(
      [exposure({ loadValue: 25, loadType: "weighted" })],
      PRESCRIPTION,
      context("db_rdl"),
    );
    expect(rec.previousText).toContain("25 lb per dumbbell");
  });

  it("machine exercises show the plain total without a per-side qualifier", () => {
    const rec = buildLoadRecommendation([exposure()], PRESCRIPTION, context("leg_press"));
    expect(rec.previousText).toContain("130 lb");
    expect(rec.previousText).not.toContain("per hand");
    expect(rec.previousText).not.toContain("per dumbbell");
  });

  it("band exercises report a band level", () => {
    const rec = buildLoadRecommendation(
      [exposure({ loadValue: null, loadType: "band", bandLevel: "medium" })],
      PRESCRIPTION,
      context("pallof_press"),
    );
    expect(rec.previousText).toContain("medium band");
  });
});

describe("progression behaviour is unchanged", () => {
  it("repeats after a single session", () => {
    const rec = buildLoadRecommendation([exposure()], PRESCRIPTION, context("leg_press"));
    expect(rec.kind).toBe("repeat");
    expect(rec.recommendedLoad).toBe(130);
  });

  it("adds reps before weight after two good sessions below the top of the range", () => {
    const rec = buildLoadRecommendation([exposure(), exposure()], PRESCRIPTION, context("leg_press"));
    expect(rec.kind).toBe("add_reps");
    expect(rec.recommendedText).toBe("130 lb for 3 sets of 12");
  });

  it("adds the exercise's own increment once at the top of the range twice", () => {
    const top = exposure({ representativeReps: 12 });
    const rec = buildLoadRecommendation([top, top], PRESCRIPTION, context("leg_press"));
    expect(rec.kind).toBe("add_load");
    expect(rec.recommendedLoad).toBe(140); // leg press increments by 10
  });

  it("uses tempo/pause/range at home when no heavier equipment is available", () => {
    const top = exposure({ representativeReps: 12, loadValue: 25, loadType: "weighted" });
    const rec = buildLoadRecommendation(
      [top, top],
      PRESCRIPTION,
      context("db_rdl", { location: "home", hasHeavierEquipmentAvailable: false }),
    );
    expect(rec.kind).toBe("home_variable");
    expect(rec.explanation).toMatch(/tempo|pause|range/);
  });

  it("does not progress when the last session was too hard", () => {
    const hard = exposure({ representativeReps: 12, difficulty: 9 });
    expect(buildLoadRecommendation([hard, hard], PRESCRIPTION, context("leg_press")).kind).toBe("repeat");
  });

  it("treats a missing difficulty as too uncertain to progress on", () => {
    const unknown = exposure({ representativeReps: 12, difficulty: null });
    expect(buildLoadRecommendation([unknown, unknown], PRESCRIPTION, context("leg_press")).kind).toBe("repeat");
  });

  it("does not progress when pain, form, or recovery evidence is unknown", () => {
    const unknown = exposure({
      representativeReps: 12,
      painIncreased: null,
      formFailed: null,
      recoveryAcceptable: null,
    });
    expect(buildLoadRecommendation([unknown, unknown], PRESCRIPTION, context("leg_press")).kind).toBe("repeat");
  });
});
