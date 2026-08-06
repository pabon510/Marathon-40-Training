import { describe, expect, it } from "vitest";
import { buildFuelingPlan, type FuelingProfile } from "./fuelingPlan";

const profile: FuelingProfile = {
  bodyWeightKg: 80,
  typicalDailyCaffeineMg: 100,
  caffeineSensitivity: "normal",
  caffeineCutoffHour: 14,
  dietaryRestrictions: [],
  lactoseTolerant: true,
};

describe("buildFuelingPlan", () => {
  it("uses the non-caffeinated Gel 100 for a 70-minute practice run", () => {
    const plan = buildFuelingPlan("long_run", 70, profile);
    expect(plan.productPlan.gel100Count).toBe(1);
    expect(plan.productPlan.gel100CafCount).toBe(0);
    expect(plan.during).toContain("non-caffeinated Maurten Gel 100");
  });

  it("does not recommend a gel for a short easy run", () => {
    const plan = buildFuelingPlan("easy_run", 35, profile);
    expect(plan.productPlan.gel100Count).toBe(0);
    expect(plan.carbohydrateTargetPerHour).toBeNull();
  });

  it("uses repeatable non-caffeinated fuel for runs over 90 minutes", () => {
    const plan = buildFuelingPlan("long_run", 120, profile);
    expect(plan.productPlan.gel100Count).toBe(3);
    expect(plan.carbohydrateTargetPerHour).toEqual({ low: 30, high: 60 });
    expect(plan.cautions.join(" ")).toContain("Do not replace every gel");
  });

  it("recognizes the available shake as a complete protein serving but not complete carbohydrate recovery", () => {
    const plan = buildFuelingPlan("strength_a", 50, profile);
    expect(plan.productPlan.shakeRecommended).toBe(true);
    expect(plan.productPlan.shakeNeedsCarbohydratePairing).toBe(true);
    expect(plan.after).toContain("30 g protein");
  });

  it("prevents caffeinated guidance when caffeine is avoided", () => {
    const plan = buildFuelingPlan("long_run", 70, { ...profile, caffeineSensitivity: "avoid" });
    expect(plan.cautions.join(" ")).toContain("avoid caffeine");
  });

  it("uses saved caffeine context without pretending it is a live daily total", () => {
    const plan = buildFuelingPlan("long_run", 70, profile);
    expect(plan.cautions.join(" ")).toContain("estimates 100 mg caffeine on a typical day");
    expect(plan.cautions.join(" ")).toContain("cutoff of 2:00 p.m.");
  });
});
