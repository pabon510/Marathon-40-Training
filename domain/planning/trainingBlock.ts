import { addDays } from "@/lib/date";

const DAY_MS = 86_400_000;
export const TRAINING_BLOCK_DAYS = 28;

function daysBetween(start: string, end: string): number {
  return Math.floor(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / DAY_MS,
  );
}

export interface TrainingBlockWindow {
  startDate: string;
  endDate: string;
  index: number;
}

/** Four-week blocks anchored to the user's first generated plan. */
export function trainingBlockWindow(anchorDate: string, targetDate: string): TrainingBlockWindow {
  const elapsed = Math.max(0, daysBetween(anchorDate, targetDate));
  const index = Math.floor(elapsed / TRAINING_BLOCK_DAYS);
  const startDate = addDays(anchorDate, index * TRAINING_BLOCK_DAYS);
  return { startDate, endDate: addDays(startDate, TRAINING_BLOCK_DAYS - 1), index };
}

export function strengthSlotKey(
  ordinal: number,
  location: "gym" | "home",
  wantShort: boolean,
): string {
  return `${ordinal}.${location}.${wantShort ? "short" : "full"}`;
}
