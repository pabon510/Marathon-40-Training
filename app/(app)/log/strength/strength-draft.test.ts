import { describe, expect, it } from "vitest";
import { parseStrengthDraft, STRENGTH_DRAFT_VERSION } from "./strength-draft";

const entry = { loadType: "machine", loadValue: "130", bandLevel: "medium", sets: "3", reps: "10", difficulty: 7, setsDiffered: false, perSetReps: ["", "", ""], done: true };

describe("strength workout draft", () => {
  it("restores logged exercise progress for the same workout", () => {
    const result = parseStrengthDraft(JSON.stringify({ version: STRENGTH_DRAFT_VERSION, exerciseIds: ["leg-press"], entries: [entry], expandedIndex: null, effort: null, highestKneeDuring: null, kneeImmediatelyAfter: null, unusualPain: false }), ["leg-press"]);
    expect(result?.entries[0]).toMatchObject({ loadValue: "130", reps: "10", difficulty: 7, done: true });
  });

  it("does not apply a draft to a changed workout", () => {
    const raw = JSON.stringify({ version: STRENGTH_DRAFT_VERSION, exerciseIds: ["leg-press"], entries: [entry] });
    expect(parseStrengthDraft(raw, ["chest-press"])).toBeNull();
  });

  it("ignores malformed browser data", () => {
    expect(parseStrengthDraft("not-json", ["leg-press"])).toBeNull();
  });
});
