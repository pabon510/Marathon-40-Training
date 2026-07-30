import { describe, expect, it } from "vitest";
import {
  buildStrengthLoadSignature,
  detectMaterialChanges,
  MATERIAL_FIELDS,
  type SessionSnapshot,
} from "./materialEdit";

function snapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionType: "run",
    completionState: "full",
    overallEffort: 5,
    highestKneeDuring: 1,
    kneeImmediatelyAfter: 1,
    completedFull: true,
    runType: "outdoor",
    isStroller: false,
    distanceMiles: 3.5,
    durationSeconds: 1800,
    strengthLoadSignature: null,
    notes: "felt fine",
    ...overrides,
  };
}

describe("detectMaterialChanges", () => {
  it("an unchanged snapshot is not a material edit", () => {
    const result = detectMaterialChanges(snapshot(), snapshot());
    expect(result.isMaterial).toBe(false);
    expect(result.changedFields).toEqual([]);
    expect(result.explanation).toBeNull();
  });

  it("a notes-only edit does not recalculate", () => {
    const result = detectMaterialChanges(snapshot(), snapshot({ notes: "actually my knee ached a bit" }));
    expect(result.isMaterial).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it("notes are deliberately excluded from the material field set", () => {
    expect(MATERIAL_FIELDS as readonly string[]).not.toContain("notes");
  });

  it("changing a knee score is material", () => {
    const result = detectMaterialChanges(snapshot(), snapshot({ highestKneeDuring: 5 }));
    expect(result.isMaterial).toBe(true);
    expect(result.changedFields).toContain("highestKneeDuring");
    expect(result.explanation).toContain("highest knee discomfort during");
  });

  it("changing effort is material", () => {
    expect(detectMaterialChanges(snapshot(), snapshot({ overallEffort: 9 })).isMaterial).toBe(true);
  });

  it("changing completion is material", () => {
    expect(
      detectMaterialChanges(snapshot(), snapshot({ completionState: "partial", completedFull: false })).isMaterial,
    ).toBe(true);
  });

  it("changing distance or duration is material", () => {
    expect(detectMaterialChanges(snapshot(), snapshot({ distanceMiles: 6 })).isMaterial).toBe(true);
    expect(detectMaterialChanges(snapshot(), snapshot({ durationSeconds: 3600 })).isMaterial).toBe(true);
  });

  it("changing workout classification is material", () => {
    expect(detectMaterialChanges(snapshot(), snapshot({ sessionType: "strength" })).isMaterial).toBe(true);
    expect(detectMaterialChanges(snapshot(), snapshot({ runType: "treadmill" })).isMaterial).toBe(true);
    expect(detectMaterialChanges(snapshot(), snapshot({ isStroller: true })).isMaterial).toBe(true);
  });

  it("changing strength load is material", () => {
    const before = snapshot({ sessionType: "strength", strengthLoadSignature: "a:3x10@130:machine:-" });
    const after = snapshot({ sessionType: "strength", strengthLoadSignature: "a:3x10@140:machine:-" });
    expect(detectMaterialChanges(before, after).isMaterial).toBe(true);
    expect(detectMaterialChanges(before, after).changedFields).toContain("strengthLoadSignature");
  });

  it("lists every changed field in one readable explanation", () => {
    const result = detectMaterialChanges(
      snapshot(),
      snapshot({ overallEffort: 8, distanceMiles: 5, notes: "changed too" }),
    );
    expect(result.changedFields).toHaveLength(2);
    expect(result.explanation).toContain("effort");
    expect(result.explanation).toContain("distance");
    expect(result.explanation).toContain(" and ");
  });
});

describe("buildStrengthLoadSignature", () => {
  const entry = {
    exerciseId: "ex-1",
    completedSets: 3,
    representativeReps: 10,
    loadValue: 130,
    loadType: "machine",
    bandLevel: null,
  };

  it("is stable regardless of entry order", () => {
    const a = buildStrengthLoadSignature([entry, { ...entry, exerciseId: "ex-2" }]);
    const b = buildStrengthLoadSignature([{ ...entry, exerciseId: "ex-2" }, entry]);
    expect(a).toBe(b);
  });

  it("changes when load changes", () => {
    expect(buildStrengthLoadSignature([entry])).not.toBe(
      buildStrengthLoadSignature([{ ...entry, loadValue: 140 }]),
    );
  });

  it("changes when reps or sets change", () => {
    expect(buildStrengthLoadSignature([entry])).not.toBe(
      buildStrengthLoadSignature([{ ...entry, representativeReps: 12 }]),
    );
    expect(buildStrengthLoadSignature([entry])).not.toBe(
      buildStrengthLoadSignature([{ ...entry, completedSets: 2 }]),
    );
  });

  it("changes when a band level changes even with no numeric load", () => {
    const banded = { ...entry, loadValue: null, loadType: "band", bandLevel: "light" };
    expect(buildStrengthLoadSignature([banded])).not.toBe(
      buildStrengthLoadSignature([{ ...banded, bandLevel: "heavy" }]),
    );
  });

  it("distinguishes bodyweight from a recorded load", () => {
    expect(
      buildStrengthLoadSignature([{ ...entry, loadValue: null, loadType: "bodyweight" }]),
    ).not.toBe(buildStrengthLoadSignature([entry]));
  });
});
