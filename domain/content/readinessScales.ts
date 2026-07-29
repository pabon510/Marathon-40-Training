/**
 * The 1-5 readiness scales shown on the morning check-in.
 *
 * These definitions are the single source of truth shared by the check-in
 * form, the post-submit result text, and the tests. Every point on every
 * scale is named, so the user never has to guess what "3" means and we never
 * have to infer intent from an unlabeled number.
 *
 * Direction differs by metric on purpose: for energy, 5 is good; for
 * soreness, stress, and fatigue, 5 is bad. `higherIsBetter` records that so
 * UI can describe a selection without hardcoding per-metric knowledge.
 */
export type ReadinessMetricName = "energy" | "soreness" | "stress" | "fatigue";

export interface ReadinessMetric {
  name: ReadinessMetricName;
  label: string;
  higherIsBetter: boolean;
  /** Index 0 describes a score of 1, index 4 describes a score of 5. */
  definitions: readonly [string, string, string, string, string];
}

export const READINESS_METRICS: readonly ReadinessMetric[] = [
  {
    name: "energy",
    label: "Energy",
    higherIsBetter: true,
    definitions: ["Depleted", "Low", "Normal", "Good", "Excellent"],
  },
  {
    name: "soreness",
    label: "Soreness",
    higherIsBetter: false,
    definitions: ["None", "Mild", "Noticeable", "High", "Severe"],
  },
  {
    name: "stress",
    label: "Stress",
    higherIsBetter: false,
    definitions: ["Very low", "Low", "Normal", "High", "Overwhelming"],
  },
  {
    name: "fatigue",
    label: "Fatigue",
    higherIsBetter: false,
    definitions: ["Fresh", "Slightly tired", "Normal", "Very tired", "Exhausted"],
  },
] as const;

export const READINESS_METRICS_BY_NAME: Readonly<Record<ReadinessMetricName, ReadinessMetric>> =
  Object.fromEntries(READINESS_METRICS.map((m) => [m.name, m])) as Record<ReadinessMetricName, ReadinessMetric>;

/** The definition word for a score, or null when the score is unanswered. */
export function readinessDefinition(metric: ReadinessMetricName, score: number | null): string | null {
  if (score === null || !Number.isInteger(score) || score < 1 || score > 5) return null;
  return READINESS_METRICS_BY_NAME[metric].definitions[score - 1]!;
}

/** True only for an integer 1-5; used to reject anything a form could smuggle in. */
export function isValidReadinessScore(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** True only for an integer 0-10. Note that 0 is a real, selectable answer. */
export function isValidKneeScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10;
}
