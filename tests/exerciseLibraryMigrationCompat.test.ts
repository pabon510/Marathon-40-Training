import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0009_exercise_library_v2_foundations.sql"),
  "utf8",
);

describe("exercise library V2 migration data compatibility", () => {
  it("is add-only and contains no historical data rewrite statement", () => {
    const executable = migration
      .replace(/--.*$/gm, "")
      .replace(/\s+/g, " ")
      .toLowerCase();

    expect(executable).not.toMatch(/\bupdate\s+(workout_sessions|strength_logs|planned_workouts)\b/);
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
  });

  it("uses nullable evidence fields so unknown legacy progression inputs remain unknown", () => {
    expect(migration).toContain("add column if not exists pain_increased boolean");
    expect(migration).toContain("add column if not exists form_failed boolean");
    expect(migration).toContain("add column if not exists recovery_acceptable boolean");
    expect(migration).not.toMatch(/pain_increased boolean not null/i);
  });

  it("preserves plans with a separate materialized strength-item table", () => {
    expect(migration).toContain("create table if not exists planned_strength_items");
    expect(migration).toContain("planned_workout_id uuid not null references planned_workouts(id)");
    expect(migration).toContain("exercise_variant_id uuid not null references exercise_variants(id)");
  });
});
