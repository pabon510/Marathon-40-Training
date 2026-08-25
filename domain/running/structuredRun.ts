import type { RunPrescription } from "@/domain/types";

export function structuredRunDurationMinutes(prescription: RunPrescription): number | null {
  if (prescription.segments?.length) {
    return prescription.segments.reduce((total, segment) => {
      const repeats = segment.repeats ?? 1;
      const recoveries = segment.recoveryRepeats ?? (segment.recoveryMinutes ? repeats : 0);
      return total + segment.durationMinutes * repeats + (segment.recoveryMinutes ?? 0) * recoveries;
    }, 0);
  }
  if (!prescription.intervals?.length) return null;
  return (prescription.warmupMinutes ?? 0)
    + (prescription.cooldownMinutes ?? 0)
    + prescription.intervals.reduce((total, interval) => {
      const recoveries = interval.recoveryRepeats ?? interval.repeats;
      return total + interval.workMinutes * interval.repeats + interval.restMinutes * recoveries;
    }, 0);
}

export function structuredRunDurationMatchesHeadline(prescription: RunPrescription): boolean {
  const described = structuredRunDurationMinutes(prescription);
  return described === null || described === prescription.durationMinutes;
}
