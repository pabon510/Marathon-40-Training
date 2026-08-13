import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0020_move_planned_workout.sql", "utf8");

describe("move planned workout migration", () => {
  it("moves atomically with authorization, safety, history, and no deletion", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(migration).toContain("actor_id uuid := auth.uid()");
    expect(migration).toContain("Today''s knee score blocks running and lower-body work.");
    expect(migration).toContain("WORKOUT_MOVED");
    expect(migration).toContain("WORKOUT_REPLACED_BY_MOVE");
    expect(migration).toContain("from planned_strength_items where planned_workout_id = source_workout.id");
    expect(migration).toContain("from planned_exercise_substitutions where planned_workout_id = source_workout.id");
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
  });
});
