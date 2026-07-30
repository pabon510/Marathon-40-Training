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

const minutes = (field: { value: number | null }) =>
  field.value === null ? "" : String(Math.round((field.value / 60) * 100) / 100);

export function extractionToFormValues(extraction: GarminExtraction): GarminFormValues {
  return {
    distanceMiles: value(extraction.distanceMiles),
    durationMinutes: minutes(extraction.totalDurationSeconds),
    paceOverrideMinutes: minutes(extraction.averagePaceSecondsPerMile),
    averageHr: value(extraction.averageHeartRate),
    maximumHr: value(extraction.maximumHeartRate),
    elevationGainFeet: value(extraction.elevationGainFeet),
    movingDurationSeconds: value(extraction.movingDurationSeconds),
    elapsedDurationSeconds: value(extraction.elapsedDurationSeconds),
    movingPaceSecondsPerMile: value(extraction.movingPaceSecondsPerMile),
    bestPaceSecondsPerMile: value(extraction.bestPaceSecondsPerMile),
    elevationLossFeet: value(extraction.elevationLossFeet),
    aerobicTrainingEffect: value(extraction.aerobicTrainingEffect),
    anaerobicTrainingEffect: value(extraction.anaerobicTrainingEffect),
    averageTemperatureF: value(extraction.averageTemperatureF),
    averageCadenceSpm: value(extraction.averageCadenceSpm),
    maximumCadenceSpm: value(extraction.maximumCadenceSpm),
    averageStrideLengthMeters: value(extraction.averageStrideLengthMeters),
  };
}
