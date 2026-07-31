import { z } from "zod";

export const WEEKLY_REVIEW_MODEL = "gpt-5.6-luna";
export const WEEKLY_REVIEW_VERSION = "weekly-review-v2";
export const WEEKLY_REVIEW_PROMPT_VERSION = "weekly-review-core-v2";
export const WEEKLY_REVIEW_RULES_VERSION = "weekly-evidence-v2";

const evidenceStatement = z.object({
  text: z.string(),
  evidenceKeys: z.array(z.string()).min(1),
});

export const weeklyReviewResultSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  wins: z.array(evidenceStatement).max(3),
  patterns: z.array(evidenceStatement).max(3),
  nextWeekFocus: evidenceStatement,
  dataQualityNote: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type WeeklyReviewResult = z.infer<typeof weeklyReviewResultSchema>;

export interface WeeklyReviewEvidence {
  rulesVersion: string;
  period: { weekStart: string; weekEnd: string; complete: boolean };
  consistency: { planned: number; credited: number; completionPercent: number; checkInDays: number; workoutDays: number };
  remainingPlan: Array<{ date: string; workoutKind: string; goal: string }>;
  running: { sessions: number; minutes: number; miles: number; strollerRuns: number; averageEffort: number | null; completedAnalyses: number };
  strength: { completedSessions: number; loggedSessions: number };
  knee: { recordedDays: number; maximum: number | null; first: number | null; latest: number | null; direction: "improving" | "stable" | "worsening" | "unknown" };
  runReviewSignals: { successful: number; caution: number; harderThanIntended: number; pendingNextMorning: number };
}

export const WEEKLY_REVIEW_PROMPT = `You write a concise weekly training recap from an authoritative evidence package calculated by application code.

Rules:
- Use only supplied evidence. Never invent causation, diagnoses, trends, workouts, personal records, or plan changes.
- When period.complete is false, write a "week so far" check-in, not a final recap. Describe completed work, mention the remainingPlan once, and make the single focus useful for executing one of those remaining sessions. Do not criticize incomplete sessions or tell the user merely to be consistent.
- When period.complete is true, evaluate the full week and make nextWeekFocus a useful takeaway for the following week.
- Reward completion of the adapted plan, including credited shortened or substitute workouts.
- Separate stroller and standard run context; never criticize stroller pace.
- Do not prescribe mileage or intensity increases. The deterministic planning system owns future training.
- Give exactly one next-week focus based on the strongest supplied signal.
- Do not repeat the same count, missing-data observation, or knee statement in multiple sections.
- A string of zero knee scores means knee discomfort remained absent; prefer that plain language over clinical phrases such as "stable direction."
- Knee patterns are observations, not diagnoses. A single high day must not be averaged away.
- evidenceKeys must be exact paths in the evidence package.
- Be supportive, candid, compact, and specific. Avoid generic praise.
- If evidence is sparse, state that and lower confidence.`;

export function weeklyReviewUserPrompt(evidence: WeeklyReviewEvidence) {
  return `Create the structured weekly coaching recap from this evidence:\n${JSON.stringify(evidence, null, 2)}`;
}
