import { describe, expect, it } from "vitest";
import { EXERCISES, TEMPLATES } from "./exerciseLibrary";

describe("exercise library content depth", () => {
  it("every exercise has setup, execution, 2-3 cues, mistakes, muscles, and stop/substitute guidance", () => {
    for (const ex of EXERCISES) {
      expect(ex.setup.length, `${ex.slug} setup`).toBeGreaterThan(10);
      expect(ex.execution.length, `${ex.slug} execution`).toBeGreaterThan(10);
      expect(ex.cues.length, `${ex.slug} cues`).toBeGreaterThanOrEqual(2);
      expect(ex.cues.length, `${ex.slug} cues`).toBeLessThanOrEqual(3);
      expect(ex.mistakes.length, `${ex.slug} mistakes`).toBeGreaterThanOrEqual(2);
      expect(ex.targetMuscles.length, `${ex.slug} muscles`).toBeGreaterThan(0);
      expect(ex.stopSubstituteGuidance.length, `${ex.slug} stop/substitute`).toBeGreaterThan(10);
    }
  });

  it("every lower-body exercise explicitly instructs stopping/substituting on increased knee discomfort", () => {
    for (const ex of EXERCISES.filter((e) => e.isLowerBody)) {
      expect(ex.stopSubstituteGuidance.toLowerCase()).toContain("knee");
    }
  });

  it("has no Smith-machine exercises", () => {
    const text = JSON.stringify(EXERCISES).toLowerCase();
    expect(text).not.toContain("smith machine");
  });

  it("has no adjustable-kettlebell swings", () => {
    const text = JSON.stringify(EXERCISES).toLowerCase();
    expect(text).not.toMatch(/kettlebell swing/);
  });

  it("every exercise has at least one variant", () => {
    for (const ex of EXERCISES) {
      expect(ex.variants.length).toBeGreaterThan(0);
    }
  });
});

describe("strength templates reference valid equivalence groups", () => {
  const allGroups = new Set(EXERCISES.flatMap((e) => e.variants.map((v) => v.equivalenceGroup)));

  it("every template item's equivalence group has at least one matching exercise variant", () => {
    for (const template of TEMPLATES) {
      for (const item of template.items) {
        expect(allGroups.has(item.equivalenceGroup), `${template.slug} item ${item.ordinal} group ${item.equivalenceGroup}`).toBe(true);
      }
    }
  });

  it("every equivalence group used by upper_core_safety excludes loaded lower-body movement groups", () => {
    const lowerBodyGroups = new Set(
      EXERCISES.filter((e) => e.isLowerBody).flatMap((e) => e.variants.map((v) => v.equivalenceGroup)),
    );
    const safetyTemplate = TEMPLATES.find((t) => t.slug === "upper_core_safety")!;
    for (const item of safetyTemplate.items) {
      expect(lowerBodyGroups.has(item.equivalenceGroup)).toBe(false);
    }
  });

  it("each template has a duration and at least 3 items", () => {
    for (const template of TEMPLATES) {
      expect(template.durationMinutes).toBeGreaterThan(0);
      expect(template.items.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("template item ordinals are unique per template", () => {
    for (const template of TEMPLATES) {
      const ordinals = template.items.map((i) => i.ordinal);
      expect(new Set(ordinals).size).toBe(ordinals.length);
    }
  });
});
