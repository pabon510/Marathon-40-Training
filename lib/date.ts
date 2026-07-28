/** Computes the "local date" (YYYY-MM-DD) for a timestamp in the given IANA timezone. */
export function localDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // en-CA formats as YYYY-MM-DD
}

export function todayLocalDate(timezone: string): string {
  return localDateInTimezone(new Date(), timezone);
}

/** Monday of the ISO week containing `localDate` (a YYYY-MM-DD string), as YYYY-MM-DD. */
export function mondayOfWeek(localDate: string): string {
  const d = new Date(`${localDate}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

export function addDays(localDate: string, days: number): string {
  const d = new Date(`${localDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function weekdayName(localDate: string): (typeof WEEKDAY_NAMES)[number] {
  const d = new Date(`${localDate}T00:00:00Z`);
  return WEEKDAY_NAMES[d.getUTCDay()]!;
}

/** Next occurrence of `weekday` on or after `fromDate` (inclusive). */
export function nextWeekday(fromDate: string, weekday: (typeof WEEKDAY_NAMES)[number]): string {
  const targetIdx = WEEKDAY_NAMES.indexOf(weekday);
  let d = fromDate;
  for (let i = 0; i < 7; i++) {
    if (WEEKDAY_NAMES.indexOf(weekdayName(d)) === targetIdx) return d;
    d = addDays(d, 1);
  }
  return fromDate;
}
