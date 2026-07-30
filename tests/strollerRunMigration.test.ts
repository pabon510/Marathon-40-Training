import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0012_stroller_run_context.sql", "utf8");

describe("stroller run migration", () => {
  it("is additive and preserves all existing plans and run history", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
    expect(executable).not.toMatch(/\bupdate\s+(planned_workouts|run_logs)\b/);
  });

  it("defaults historical records to standard non-stroller context", () => {
    expect(migration).toContain("run_context text not null default 'standard'");
    expect(migration).toContain("is_stroller boolean not null default false");
  });
});

