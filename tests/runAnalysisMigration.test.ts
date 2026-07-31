import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0015_run_analysis.sql", "utf8");

describe("run analysis migration", () => {
  it("creates private screenshot retention and analysis records with RLS", () => {
    expect(migration).toContain("'garmin-run-screenshots', false");
    expect(migration).toContain("create table run_import_images");
    expect(migration).toContain("interval '180 days'");
    expect(migration).toContain("create table run_analyses");
    expect(migration).toContain("alter table run_import_images enable row level security");
    expect(migration).toContain("alter table run_analyses enable row level security");
  });

  it("does not rewrite existing run history", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(executable).not.toMatch(/\btruncate\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
    expect(executable).not.toMatch(/\bupdate\s+(workout_sessions|run_logs)\b/);
  });
});
