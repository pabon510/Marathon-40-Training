export type ReminderType = "daily_checkin" | "weekly_planning" | "unlogged_workout";

export interface LocalReminderClock {
  localDate: string;
  hour: number;
  weekday: string;
}

export function localReminderClock(now: Date, timezone: string): LocalReminderClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "long",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    localDate: `${read("year")}-${read("month")}-${read("day")}`,
    hour: Number(read("hour")),
    weekday: read("weekday").toLowerCase(),
  };
}

/** The cron route can run at several UTC hours; only locally due reminders proceed. */
export function dueReminderTypes(clock: LocalReminderClock): ReminderType[] {
  const weekend = clock.weekday === "saturday" || clock.weekday === "sunday";
  const due: ReminderType[] = [];
  if (clock.hour === 5) due.push("daily_checkin");
  if (!weekend && clock.hour === 10) due.push("unlogged_workout");
  if (weekend && clock.hour === 20) due.push("unlogged_workout");
  if (clock.weekday === "sunday" && clock.hour === 20) due.push("weekly_planning");
  return due;
}
