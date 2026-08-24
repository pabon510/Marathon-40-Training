import { describe, expect, it } from "vitest";
import { dueReminderTypes, localReminderClock } from "./schedule";

describe("push reminder schedule", () => {
  it("handles daylight and standard time through the profile timezone", () => {
    expect(localReminderClock(new Date("2026-08-24T09:15:00Z"), "America/New_York").hour).toBe(5);
    expect(localReminderClock(new Date("2026-12-14T10:15:00Z"), "America/New_York").hour).toBe(5);
  });

  it("sends daily check-in reminders at 5", () => {
    expect(dueReminderTypes({ localDate: "2026-08-24", hour: 5, weekday: "monday" })).toEqual(["daily_checkin"]);
  });

  it("uses 10 on weekdays and 20 on weekends for unlogged workouts", () => {
    expect(dueReminderTypes({ localDate: "2026-08-24", hour: 10, weekday: "monday" })).toEqual(["unlogged_workout"]);
    expect(dueReminderTypes({ localDate: "2026-08-29", hour: 20, weekday: "saturday" })).toEqual(["unlogged_workout"]);
  });

  it("adds weekly planning on Sunday evening", () => {
    expect(dueReminderTypes({ localDate: "2026-08-30", hour: 20, weekday: "sunday" })).toEqual([
      "unlogged_workout",
      "weekly_planning",
    ]);
  });
});
