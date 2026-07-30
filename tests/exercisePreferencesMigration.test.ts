import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/0010_exercise_preferences.sql",
  "utf8",
);

describe("exercise preferences migration", () => {
  it("is additive and never rewrites training history", () => {
    const executable = migration
      .replace(/--.*$/gm, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
    expect(executable).not.toMatch(/\bupdate\s+(workout_sessions|strength_logs|planned_workouts)\b/);
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
  });

  it("limits preferences to prefer or avoid and protects rows with RLS", () => {
    expect(migration).toContain("preference in ('prefer', 'avoid')");
    expect(migration).toContain("alter table exercise_preferences enable row level security");
    expect(migration).toContain("auth.uid() = user_id");
  });
});
