import type { AvailableTime, Scale1to5 } from "@/domain/types";
import { isValidKneeScore, isValidReadinessScore, type ReadinessMetricName } from "@/domain/content/readinessScales";

/**
 * Turns raw check-in form data into a validated payload.
 *
 * Kept out of `actions.ts` (which is `"use server"`, so every export there
 * must be an async server action) purely so it can be unit-tested directly.
 *
 * The central rule: an untouched field parses to `null` and is recorded in
 * `skippedFields`. Nothing is ever inferred, defaulted, or rounded into a
 * score the user did not pick — including knee, where 0 is a real answer and
 * must never stand in for "unanswered".
 */

export const AVAILABLE_TIMES: readonly AvailableTime[] = ["15", "30", "45", "60", "75", "90_plus"];

/** Minutes implied by each option; `90_plus` imposes no cap, so it has none. */
export const AVAILABLE_TIME_MINUTES: Readonly<Record<AvailableTime, number | null>> = {
  "15": 15,
  "30": 30,
  "45": 45,
  "60": 60,
  "75": 75,
  "90_plus": null,
};

const READINESS_FIELDS: readonly ReadinessMetricName[] = ["energy", "soreness", "stress", "fatigue"];

const MAX_REASONABLE_SLEEP_HOURS = 24;

export interface ParsedCheckIn {
  hoursSlept: number | null;
  ouraScore: number | null;
  energy: Scale1to5 | null;
  soreness: Scale1to5 | null;
  stress: Scale1to5 | null;
  fatigue: Scale1to5 | null;
  knee: number | null;
  availableTime: AvailableTime;
  /** Minutes the user actually chose, or null when unanswered or "90+". */
  availableMinutes: number | null;
  strengthLocation: "gym" | "home" | null;
  skippedFields: string[];
}

export type ParseCheckInResult = { ok: true; value: ParsedCheckIn } | { ok: false; error: string };

function raw(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseCheckInFormData(formData: FormData): ParseCheckInResult {
  const skippedFields: string[] = [];

  // --- Sleep -------------------------------------------------------------
  const hoursSleptRaw = raw(formData, "hoursSlept");
  let hoursSlept: number | null = null;
  if (hoursSleptRaw === "") {
    skippedFields.push("hoursSlept");
  } else {
    const parsed = Number(hoursSleptRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_REASONABLE_SLEEP_HOURS) {
      return { ok: false, error: "Hours slept should be a number between 0 and 24." };
    }
    hoursSlept = parsed;
  }

  const ouraRaw = raw(formData, "ouraScore");
  let ouraScore: number | null = null;
  if (ouraRaw === "") {
    skippedFields.push("ouraScore");
  } else {
    const parsed = Number(ouraRaw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      return { ok: false, error: "Oura sleep score should be a whole number between 0 and 100." };
    }
    ouraScore = parsed;
  }

  // --- Readiness (1-5) ---------------------------------------------------
  const readiness: Record<ReadinessMetricName, Scale1to5 | null> = {
    energy: null,
    soreness: null,
    stress: null,
    fatigue: null,
  };
  for (const field of READINESS_FIELDS) {
    const value = raw(formData, field);
    if (value === "") {
      skippedFields.push(field);
      continue;
    }
    const parsed = Number(value);
    if (!isValidReadinessScore(parsed)) {
      return { ok: false, error: "Readiness answers should each be a whole number from 1 to 5." };
    }
    readiness[field] = parsed;
  }

  // --- Knee (0-10; 0 is a real answer) -----------------------------------
  const kneeRaw = raw(formData, "knee");
  let knee: number | null = null;
  if (kneeRaw === "") {
    skippedFields.push("knee");
  } else {
    const parsed = Number(kneeRaw);
    if (!isValidKneeScore(parsed)) {
      return { ok: false, error: "Knee discomfort should be a whole number from 0 to 10." };
    }
    knee = parsed;
  }

  // --- Available time ----------------------------------------------------
  // The column is NOT NULL, so an unanswered value has to store *something*.
  // We store "90_plus" because it is the only option that imposes no cap:
  // a question the user never answered must never silently shorten training.
  const availableRaw = raw(formData, "availableTime");
  let availableTime: AvailableTime;
  if (availableRaw === "") {
    skippedFields.push("availableTime");
    availableTime = "90_plus";
  } else if ((AVAILABLE_TIMES as readonly string[]).includes(availableRaw)) {
    availableTime = availableRaw as AvailableTime;
  } else {
    return { ok: false, error: "Please choose one of the available time options." };
  }

  // --- Strength location (only when today is a strength workout) ---------
  const needsLocation = raw(formData, "needsLocation") === "true";
  const locationRaw = raw(formData, "strengthLocation");
  let strengthLocation: "gym" | "home" | null = null;
  if (locationRaw === "gym" || locationRaw === "home") {
    strengthLocation = locationRaw;
  } else if (locationRaw !== "") {
    return { ok: false, error: "Please choose gym or home for today's strength workout." };
  } else if (needsLocation) {
    return { ok: false, error: "Please choose gym or home for today's strength workout." };
  }

  return {
    ok: true,
    value: {
      hoursSlept,
      ouraScore,
      energy: readiness.energy,
      soreness: readiness.soreness,
      stress: readiness.stress,
      fatigue: readiness.fatigue,
      knee,
      availableTime,
      availableMinutes: availableRaw === "" ? null : AVAILABLE_TIME_MINUTES[availableTime],
      strengthLocation,
      skippedFields,
    },
  };
}
