import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { computeRecoverySignals } from "@/domain/adaptation/recovery";
import { evaluateDailyAdaptation } from "@/domain/adaptation/evaluate";
import { buildCheckInOutcome } from "@/domain/adaptation/checkinOutcome";
import { readinessDefinition } from "@/domain/content/readinessScales";
import type { WorkoutKind } from "@/domain/types";

/**
 * Requirement 11: existing check-in and workout records must keep rendering.
 *
 * Rows written by the *previous* version of the form look different from new
 * ones: the old sliders always posted a value, so historical rows have
 * energy/soreness/stress/fatigue filled in, knee stored as 0 whether or not
 * the user meant it, and an empty `skipped_fields`. Rows written after this
 * change may legitimately contain nulls. Both shapes have to survive every
 * read path, and neither may be rewritten.
 */

/** A row as the pre-redesign slider form would have saved it. */
const legacyCheckIn = Object.freeze({
  id: "0f1a1f7c-4a1c-4f0e-9d3a-9d2b6f1c7e11",
  user_id: "11111111-1111-1111-1111-111111111111",
  local_date: "2026-07-28",
  hours_slept: 7.5,
  oura_score: 84,
  energy: 3,
  soreness: 3,
  stress: 3,
  fatigue: 3,
  knee: 0,
  available_time: "45",
  strength_location: "home",
  skipped_fields: [] as string[],
  refreshed_from_id: null,
});

/** A row as the redesigned form saves it when fields are left unanswered. */
const modernSparseCheckIn = Object.freeze({
  id: "0f1a1f7c-4a1c-4f0e-9d3a-9d2b6f1c7e12",
  user_id: "11111111-1111-1111-1111-111111111111",
  local_date: "2026-07-29",
  hours_slept: null,
  oura_score: null,
  energy: 2,
  soreness: null,
  stress: null,
  fatigue: 4,
  knee: null,
  available_time: "90_plus",
  strength_location: null,
  skipped_fields: ["hoursSlept", "ouraScore", "soreness", "stress", "knee"],
  refreshed_from_id: null,
});

describe("historical check-in rows stay readable", () => {
  it("computes recovery signals from a legacy fully-populated row", () => {
    const signals = computeRecoverySignals({
      energy: legacyCheckIn.energy as 3,
      soreness: legacyCheckIn.soreness as 3,
      fatigue: legacyCheckIn.fatigue as 3,
      hoursSlept: legacyCheckIn.hours_slept,
      ouraScore: legacyCheckIn.oura_score,
      recentOuraAverage: null,
      poorRecoveryYesterday: false,
    });

    expect(signals.poorRecoveryPresent).toBe(false);
    expect(signals.signalCount).toBe(0);
  });

  it("computes recovery signals from a sparse modern row without throwing", () => {
    const signals = computeRecoverySignals({
      energy: modernSparseCheckIn.energy as 2,
      soreness: null,
      fatigue: modernSparseCheckIn.fatigue as 4,
      hoursSlept: null,
      ouraScore: null,
      recentOuraAverage: null,
      poorRecoveryYesterday: false,
    });

    // Only low energy qualifies; a null is never counted as a poor signal.
    expect(signals.lowEnergy).toBe(true);
    expect(signals.signalCount).toBe(1);
    expect(signals.poorRecoveryPresent).toBe(false);
  });

  it("evaluates a legacy row to the same decision it would have produced before", () => {
    const result = evaluateDailyAdaptation({
      plannedWorkoutKind: "strength_b",
      plannedDurationMinutes: 45,
      morningKnee: legacyCheckIn.knee,
      priorDailyKnee: 0,
      recovery: {
        energy: legacyCheckIn.energy as 3,
        soreness: legacyCheckIn.soreness as 3,
        fatigue: legacyCheckIn.fatigue as 3,
        hoursSlept: legacyCheckIn.hours_slept,
        ouraScore: legacyCheckIn.oura_score,
        recentOuraAverage: null,
        poorRecoveryYesterday: false,
      },
      availableTime: "45",
      localDate: legacyCheckIn.local_date,
    });

    expect(result.chosenWorkoutKind).toBe("strength_b");
    expect(result.category).toBe("full");
    expect(result.blocked).toBe(false);
  });

  it("renders a result message for a legacy row", () => {
    const outcome = buildCheckInOutcome({
      changed: false,
      before: { workoutKind: "strength_b" as WorkoutKind, durationMinutes: 45, locationChoice: "home" },
      after: { workoutKind: "strength_b" as WorkoutKind, durationMinutes: 45, locationChoice: "home" },
      blocked: false,
      reasonCode: "NO_CHANGE",
      fallbackExplanation: "Knee discomfort is low and stable or improving, so today's planned workout is kept.",
      values: {
        knee: legacyCheckIn.knee,
        priorDailyKnee: 0,
        energy: legacyCheckIn.energy,
        soreness: legacyCheckIn.soreness,
        fatigue: legacyCheckIn.fatigue,
        hoursSlept: legacyCheckIn.hours_slept,
        ouraScore: legacyCheckIn.oura_score,
        availableMinutes: 45,
      },
    });

    expect(outcome.headline).toBe("Workout confirmed: Home Strength B, 45 minutes");
  });

  it("labels every legacy stored score with a definition", () => {
    for (const metric of ["energy", "soreness", "stress", "fatigue"] as const) {
      expect(readinessDefinition(metric, legacyCheckIn[metric])).toBeTruthy();
    }
  });

  it("renders nulls from a sparse row as 'unanswered' rather than crashing", () => {
    expect(readinessDefinition("soreness", null)).toBeNull();
    expect(readinessDefinition("stress", null)).toBeNull();
  });

  it("never mutates the rows it reads", () => {
    const legacySnapshot = JSON.parse(JSON.stringify(legacyCheckIn));
    const modernSnapshot = JSON.parse(JSON.stringify(modernSparseCheckIn));

    for (const row of [legacyCheckIn, modernSparseCheckIn]) {
      computeRecoverySignals({
        energy: row.energy as 1 | 2 | 3 | 4 | 5 | null,
        soreness: row.soreness as 1 | 2 | 3 | 4 | 5 | null,
        fatigue: row.fatigue as 1 | 2 | 3 | 4 | 5 | null,
        hoursSlept: row.hours_slept,
        ouraScore: row.oura_score,
        recentOuraAverage: null,
        poorRecoveryYesterday: false,
      });
    }

    expect(legacyCheckIn).toEqual(legacySnapshot);
    expect(modernSparseCheckIn).toEqual(modernSnapshot);
  });
});

describe("no migration touches stored check-in or workout history", () => {
  const migrations = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ name: f, sql: readFileSync(`supabase/migrations/${f}`, "utf-8").toLowerCase() }));

  it("has at least the eight known migrations", () => {
    expect(migrations.length).toBeGreaterThanOrEqual(8);
  });

  it.each(["morning_check_ins", "workout_sessions", "strength_logs", "run_logs", "planned_workouts"])(
    "never drops, truncates, deletes from or rewrites %s",
    (table) => {
      for (const { name, sql } of migrations) {
        expect(sql, name).not.toMatch(new RegExp(`drop\\s+table[^;]*${table}`));
        expect(sql, name).not.toMatch(new RegExp(`truncate[^;]*${table}`));
        expect(sql, name).not.toMatch(new RegExp(`delete\\s+from\\s+${table}`));
        expect(sql, name).not.toMatch(new RegExp(`update\\s+${table}\\s+set`));
      }
    },
  );

  it("never drops a column that holds check-in answers", () => {
    for (const { name, sql } of migrations) {
      expect(sql, name).not.toMatch(/alter\s+table\s+morning_check_ins[^;]*drop\s+column/);
    }
  });
});
