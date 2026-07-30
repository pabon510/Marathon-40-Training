import type { GarminExtraction } from "./garminScreenshot";

export interface GarminFormValues {
  distanceMiles: string;
  durationMinutes: string;
  paceOverrideMinutes: string;
  averageHr: string;
  maximumHr: string;
  elevationGainFeet: string;
  movingDurationSeconds: string;
  elapsedDurationSeconds: string;
  movingPaceSecondsPerMile: string;
  bestPaceSecondsPerMile: string;
  elevationLossFeet: string;
  aerobicTrainingEffect: string;
  anaerobicTrainingEffect: string;
  averageTemperatureF: string;
  averageCadenceSpm: string;
  maximumCadenceSpm: string;
  averageStrideLengthMeters: string;
}

const value = (field: { value: number | null }) =>
  field.value === null ? "" : String(field.value);

export function formatSecondsAsClock(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "";
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, "0")}`;
}

const clock = (field: { value: number | null }) => formatSecondsAsClock(field.value);

export function extractionToFormValues(extraction: GarminExtraction): GarminFormValues {
  return {
    distanceMiles: value(extraction.distanceMiles),
    durationMinutes: clock(extraction.totalDurationSeconds),
    paceOverrideMinutes: clock(extraction.averagePaceSecondsPerMile),
    averageHr: value(extraction.averageHeartRate),
    maximumHr: value(extraction.maximumHeartRate),
    elevationGainFeet: value(extraction.elevationGainFeet),
    movingDurationSeconds: clock(extraction.movingDurationSeconds),
    elapsedDurationSeconds: clock(extraction.elapsedDurationSeconds),
    movingPaceSecondsPerMile: clock(extraction.movingPaceSecondsPerMile),
    bestPaceSecondsPerMile: clock(extraction.bestPaceSecondsPerMile),
    elevationLossFeet: value(extraction.elevationLossFeet),
    aerobicTrainingEffect: value(extraction.aerobicTrainingEffect),
    anaerobicTrainingEffect: value(extraction.anaerobicTrainingEffect),
    averageTemperatureF: value(extraction.averageTemperatureF),
    averageCadenceSpm: value(extraction.averageCadenceSpm),
    maximumCadenceSpm: value(extraction.maximumCadenceSpm),
    averageStrideLengthMeters: value(extraction.averageStrideLengthMeters),
  };
}
