import { describe, expect, it } from "vitest";
import { parseFuelingLogForm } from "./fuelingService";

describe("parseFuelingLogForm", () => {
  it("stores familiar products as approximate servings", () => {
    const form = new FormData();
    form.set("fuelPreIntake", "snack");
    form.set("fuelPreTiming", "1_2_hours");
    form.set("fuelGel100Count", "1");
    form.set("fuelGel100CafCount", "0.5");
    form.set("fuelPostRecovery", "shake_plus_carb");
    form.set("fuelPostTiming", "30_60");
    form.set("fuelGiResponse", "comfortable");
    form.set("fuelEnergyResponse", "steady");

    expect(parseFuelingLogForm(form)).toMatchObject({
      pre_intake: "snack",
      pre_timing: "1_2_hours",
      gel_100_count: 1,
      gel_100_caf_count: 0.5,
      post_recovery: "shake_plus_carb",
      post_timing: "30_60",
      gi_response: "comfortable",
      energy_response: "steady",
    });
  });

  it("rejects invented enum values and unsafe serving counts", () => {
    const form = new FormData();
    form.set("fuelPreIntake", "protein_grams_guess");
    form.set("fuelGel100Count", "99");
    form.set("fuelGel100CafCount", "0.3");

    expect(parseFuelingLogForm(form)).toMatchObject({
      pre_intake: null,
      gel_100_count: 0,
      gel_100_caf_count: 0,
    });
  });
});
