/** Calculates pace in seconds/mile from distance and duration. Null for zero/invalid distance. */
export function calculatePaceSecondsPerMile(distanceMiles: number, durationSeconds: number): number | null {
  if (!distanceMiles || distanceMiles <= 0) return null;
  return durationSeconds / distanceMiles;
}

/** Formats seconds/mile as "M:SS/mi" (rounded to the nearest second). */
export function formatPace(secondsPerMile: number): string {
  const rounded = Math.round(secondsPerMile);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/mi`;
}

/** Formats a duration in seconds as "H:MM:SS" (or "M:SS" under an hour). */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
