import { describe, expect, it } from "vitest";
import { getStrengthWarmup } from "@/domain/content/strengthWarmups";

describe("strength warmups", () => {
  it.each(["strength_a", "strength_b", "strength_full", "combined_short", "upper_core_safety"] as const)(
    "provides a separate warmup for %s",
    (kind) => {
      const warmup = getStrengthWarmup(kind, "home");
      expect(warmup).not.toBeNull();
      expect(warmup!.durationMinutes).toBeGreaterThan(0);
      expect(warmup!.rampUpGuidance).toContain("set");
    },
  );

  it("does not add a warmup to runs or rest", () => {
    expect(getStrengthWarmup("easy_run", "home")).toBeNull();
    expect(getStrengthWarmup("active_recovery", "home")).toBeNull();
    expect(getStrengthWarmup("rest", "home")).toBeNull();
  });
});
