import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0016_weekly_coaching_reviews.sql"), "utf8");

describe("weekly coaching review migration", () => {
  it("is additive and user-scoped", () => {
    expect(sql).toContain("create table weekly_coaching_reviews");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).not.toMatch(/drop table|truncate|delete from/i);
  });
});
