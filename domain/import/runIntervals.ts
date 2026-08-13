import { z } from "zod";
import { confidenceSchema, intervalStepTypeSchema } from "./garminScreenshot";

export const reviewedIntervalStepSchema = z.object({
  ordinal: z.number().int().positive(),
  stepType: intervalStepTypeSchema,
  repetitionNumber: z.number().int().positive().nullable(),
  durationSeconds: z.number().nonnegative().nullable(),
  distanceMiles: z.number().nonnegative().nullable(),
  averagePaceSecondsPerMile: z.number().nonnegative().nullable(),
  averageHeartRate: z.number().int().min(30).max(250).nullable(),
  maximumHeartRate: z.number().int().min(30).max(250).nullable(),
  included: z.boolean(),
  confidence: confidenceSchema,
  evidence: z.string().max(500),
  sourceImageIndex: z.number().int().min(1).max(5).nullable(),
});

export type ReviewedIntervalStep = z.infer<typeof reviewedIntervalStepSchema>;

const reviewedIntervalsSchema = z.array(reviewedIntervalStepSchema).max(100);

export function parseReviewedIntervals(raw: FormDataEntryValue | null): ReviewedIntervalStep[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const parsed = reviewedIntervalsSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("Review the extracted interval rows before saving.");
  return parsed.data;
}

export function includedWorkIntervals(steps: ReviewedIntervalStep[]) {
  return steps.filter((step) => step.included && step.stepType === "work");
}

export function paceSpreadSeconds(steps: ReviewedIntervalStep[]): number | null {
  const paces = includedWorkIntervals(steps)
    .map((step) => step.averagePaceSecondsPerMile)
    .filter((pace): pace is number => pace !== null);
  if (paces.length < 2) return null;
  return Math.max(...paces) - Math.min(...paces);
}
