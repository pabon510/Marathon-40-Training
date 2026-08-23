import { describe, expect, it } from "vitest";
import { parsePushReminderPreferences, serializePushReminderPreferences } from "./preferences";

describe("push reminder preferences", () => {
  it("does not silently enable reminders for old or malformed profiles", () => {
    expect(parsePushReminderPreferences(null)).toEqual({ dailyCheckIn: false, weeklyPlanning: false, unloggedWorkout: false });
    expect(parsePushReminderPreferences({ morning_checkin_email: true })).toEqual({ dailyCheckIn: false, weeklyPlanning: false, unloggedWorkout: false });
  });

  it("round-trips the three push choices", () => {
    const preferences = { dailyCheckIn: true, weeklyPlanning: true, unloggedWorkout: false };
    expect(parsePushReminderPreferences(serializePushReminderPreferences(preferences))).toEqual(preferences);
  });
});
