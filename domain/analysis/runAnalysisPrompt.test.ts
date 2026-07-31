import { describe, expect, it } from "vitest";
import { scenarioPrompt } from "./runAnalysisPrompt";

describe("run analysis prompt routing", () => {
  it("combines the relevant scenario modules", () => {
    const prompt = scenarioPrompt({ workoutKind: "easy_run", isStroller: true, runType: "run_walk", isCalibration: true, hasChartEvidence: false });
    expect(prompt).toContain("Easy-run module");
    expect(prompt).toContain("Stroller module");
    expect(prompt).toContain("Run-walk module");
    expect(prompt).toContain("Calibration module");
    expect(prompt).toContain("Limited-chart module");
  });
});
