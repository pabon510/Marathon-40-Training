import type { RunPrescription } from "@/domain/types";

export function structuredRunDurationMinutes(prescription: RunPrescription): number | null {
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
