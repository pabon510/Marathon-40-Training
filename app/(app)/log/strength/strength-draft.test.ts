import { describe, expect, it } from "vitest";
import type { ExerciseEntry } from "./exercise-card";
import { parseStrengthDraft, reconcileStrengthDraft, STRENGTH_DRAFT_VERSION } from "./strength-draft";

const entry: ExerciseEntry = { loadType: "machine", loadValue: "130", bandLevel: "medium", sets: "3", reps: "10", difficulty: 7, setsDiffered: false, perSetReps: ["", "", ""], done: true };

describe("strength workout draft", () => {
  it("restores logged exercise progress for the same workout", () => {
    const result = parseStrengthDraft(JSON.stringify({ version: STRENGTH_DRAFT_VERSION, exerciseIds: ["leg-press"], entries: [entry], expandedIndex: null, effort: null, highestKneeDuring: null, kneeImmediatelyAfter: null, unusualPain: false }), ["leg-press"]);
    expect(result?.entries[0]).toMatchObject({ loadValue: "130", reps: "10", difficulty: 7, done: true });
  });

  it("does not apply a draft to a changed workout", () => {
    const raw = JSON.stringify({ version: STRENGTH_DRAFT_VERSION, exerciseIds: ["leg-press"], entries: [entry] });
    expect(parseStrengthDraft(raw, ["chest-press"])).toBeNull();
  });

  it("preserves unaffected entries and resets only a substituted exercise", () => {
    const chestEntry = { ...entry, loadValue: "70", reps: "8" };
    const raw = JSON.stringify({
      version: STRENGTH_DRAFT_VERSION,
      exerciseIds: ["leg-press", "pallof-press", "chest-press"],
      entries: [entry, { ...entry, loadType: "weighted", loadValue: "25" }, chestEntry],
      expandedIndex: 1,
      effort: null,
      highestKneeDuring: null,
      kneeImmediatelyAfter: null,
      unusualPain: false,
    });
    const freshSubstitute: ExerciseEntry = { ...entry, loadType: "machine", loadValue: "", reps: "", difficulty: null, done: false };
    const result = reconcileStrengthDraft(
      raw,
      ["leg-press", "rotary-torso", "chest-press"],
      [{ ...entry, done: false }, freshSubstitute, { ...chestEntry, done: false }],
    );

    expect(result?.entries[0]).toMatchObject({ loadValue: "130", done: true });
    expect(result?.entries[1]).toEqual(freshSubstitute);
    expect(result?.entries[2]).toMatchObject({ loadValue: "70", reps: "8", done: true });
    expect(result?.exerciseIds).toEqual(["leg-press", "rotary-torso", "chest-press"]);
  });

  it("ignores malformed browser data", () => {
    expect(parseStrengthDraft("not-json", ["leg-press"])).toBeNull();
  });
});
