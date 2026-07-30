import type { PrescriptionMetric, RepBasis } from "./exerciseLibrary";

export function metricLabel(metric: PrescriptionMetric): string {
  switch (metric) {
    case "seconds":
      return "Seconds";
    case "distance_feet":
      return "Distance (feet)";
    case "steps":
      return "Steps";
    case "breaths":
      return "Breaths";
    default:
      return "Reps";
  }
}

export function metricUnit(metric: PrescriptionMetric): string {
  switch (metric) {
    case "seconds":
      return "sec";
    case "distance_feet":
      return "ft";
    case "steps":
      return "steps";
    case "breaths":
      return "breaths";
    default:
      return "reps";
  }
}

export function metricResultLabel(metric: PrescriptionMetric, repScope: RepBasis): string {
  const side = repScope === "per_side" ? " per side" : "";
  if (metric === "reps") return `Reps${side} per set`;
  return `${metricLabel(metric)}${side}`;
}

