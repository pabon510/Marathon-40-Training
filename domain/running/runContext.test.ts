import { describe, expect, it } from "vitest";
import { allowsStrollerContext, runContextGuidance } from "./runContext";

describe("stroller run context", () => {
  it("allows stroller context only for easy and long runs", () => {
    expect(allowsStrollerContext("easy_run")).toBe(true);
    expect(allowsStrollerContext("long_run")).toBe(true);
    expect(allowsStrollerContext("threshold_run")).toBe(false);
    expect(allowsStrollerContext("combined_short")).toBe(false);
  });

  it("makes heart rate and duration primary for stroller running", () => {
    expect(runContextGuidance("stroller")).toContain("duration and heart rate");
    expect(runContextGuidance("stroller")).toContain("other stroller runs");
  });
});

