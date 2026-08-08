import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0018_early_morning_fueling.sql", "utf8");

describe("early-morning fueling migration", () => {
  it("adds a safe default without rewriting existing profiles or history", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(migration).toContain("fueling_timing_preference text not null default 'early_morning'");
    expect(executable).not.toMatch(/\bupdate\b/);
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
  });
});
