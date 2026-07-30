import { z } from "zod";

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export type ExtractionConfidence = z.infer<typeof confidenceSchema>;

export const extractedNumberSchema = z.object({
  value: z.number().nullable(),
  confidence: confidenceSchema.nullable(),
  evidence: z.string().nullable(),
  sourceImageIndex: z.number().int().min(1).max(5).nullable(),
});

export const garminExtractionSchema = z.object({
  distanceMiles: extractedNumberSchema,
  totalDurationSeconds: extractedNumberSchema,
  movingDurationSeconds: extractedNumberSchema,
  elapsedDurationSeconds: extractedNumberSchema,
  averagePaceSecondsPerMile: extractedNumberSchema,
  movingPaceSecondsPerMile: extractedNumberSchema,
  bestPaceSecondsPerMile: extractedNumberSchema,
  averageHeartRate: extractedNumberSchema,
  maximumHeartRate: extractedNumberSchema,
  elevationGainFeet: extractedNumberSchema,
  elevationLossFeet: extractedNumberSchema,
  aerobicTrainingEffect: extractedNumberSchema,
  anaerobicTrainingEffect: extractedNumberSchema,
  averageTemperatureF: extractedNumberSchema,
  averageCadenceSpm: extractedNumberSchema,
  maximumCadenceSpm: extractedNumberSchema,
  averageStrideLengthMeters: extractedNumberSchema,
  warnings: z.array(z.string()),
});

export type GarminExtraction = z.infer<typeof garminExtractionSchema>;
export type ExtractedNumber = z.infer<typeof extractedNumberSchema>;

export const GARMIN_IMPORT_MODEL = "gpt-5.6-luna";
export const GARMIN_PARSER_VERSION = "garmin-summary-v1";

export const GARMIN_EXTRACTION_PROMPT = `Extract printed Garmin running summary statistics from all supplied screenshots.

Rules:
- Return null for any value that is absent, ambiguous, or visible only by estimating a graph.
- Reconcile duplicate fields across screenshots. If printed values conflict, use null and add a warning.
- Normalize distance to miles, duration to seconds, pace to seconds per mile, elevation to feet, temperature to Fahrenheit, cadence to steps per minute, and stride length to meters.
- Total duration means Garmin "Total Time"; moving duration means "Moving Time"; elapsed duration means "Elapsed Time".
- Evidence must be a short transcription such as "Avg Heart Rate 146 bpm", never a long explanation.
- sourceImageIndex is one-based in upload order.
- Confidence is high for a clearly printed labeled statistic, medium for a partially obscured but readable label/value, and low only when still directly readable. Never infer missing statistics.
- Do not treat phone status-bar time, battery, graph axis labels, help text, calories, or speed as requested run statistics.
- Multiple screenshots may overlap. Return each statistic once.`;

export function numericValue(field: ExtractedNumber): number | null {
  return Number.isFinite(field.value) ? field.value : null;
}

