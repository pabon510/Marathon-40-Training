/**
 * Pure helpers for the "preview a day's workout" screen (`/plan/[date]`).
 * Kept dependency-free so the CTA/banner logic is unit-testable without a
 * database or DOM.
 */
export type DayRelation = "past" | "today" | "future";

export function relationToToday(localDate: string, today: string): DayRelation {
  if (localDate < today) return "past";
  if (localDate > today) return "future";
  return "today";
}

const FUTURE_PREVIEW_NOTE =
  "Preview only — this may still change based on that morning's check-in (recovery, knee discomfort, available time).";

/** The explanatory note shown under a previewed day, or null when none applies (today/past). */
export function previewNote(relation: DayRelation): string | null {
  return relation === "future" ? FUTURE_PREVIEW_NOTE : null;
}

/** A YYYY-MM-DD path segment is well-formed and represents a real calendar date. */
export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}
