export interface PushReminderPreferences {
  dailyCheckIn: boolean;
  weeklyPlanning: boolean;
  unloggedWorkout: boolean;
}

export const DEFAULT_PUSH_REMINDER_PREFERENCES: PushReminderPreferences = {
  dailyCheckIn: false,
  weeklyPlanning: false,
  unloggedWorkout: false,
};

export function parsePushReminderPreferences(value: unknown): PushReminderPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PUSH_REMINDER_PREFERENCES;
  }
  const record = value as Record<string, unknown>;
  return {
    dailyCheckIn: record.daily_checkin_push === true,
    weeklyPlanning: record.weekly_planning_push === true,
    unloggedWorkout: record.unlogged_workout_push === true,
  };
}

export function serializePushReminderPreferences(value: PushReminderPreferences) {
  return {
    daily_checkin_push: value.dailyCheckIn,
    weekly_planning_push: value.weeklyPlanning,
    unlogged_workout_push: value.unloggedWorkout,
  };
}
