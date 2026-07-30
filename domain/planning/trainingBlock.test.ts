import { describe, expect, it } from "vitest";
import { strengthSlotKey, trainingBlockWindow } from "./trainingBlock";

describe("four-week strength blocks", () => {
  it("keeps every date in the first 28 days in one block", () => {
    expect(trainingBlockWindow("2026-07-06", "2026-07-06")).toEqual({
      startDate: "2026-07-06",
      endDate: "2026-08-02",
      index: 0,
    });
    expect(trainingBlockWindow("2026-07-06", "2026-08-02").index).toBe(0);
  });

  it("moves to a new deterministic block at day 29", () => {
    expect(trainingBlockWindow("2026-07-06", "2026-08-03")).toEqual({
      startDate: "2026-08-03",
      endDate: "2026-08-30",
      index: 1,
    });
  });

  it("keeps gym, home, full, and short selections separate", () => {
    expect(strengthSlotKey(6, "gym", false)).toBe("6.gym.full");
    expect(strengthSlotKey(6, "home", false)).toBe("6.home.full");
    expect(strengthSlotKey(6, "home", true)).toBe("6.home.short");
  });
});
