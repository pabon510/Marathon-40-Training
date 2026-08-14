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

  it("defines threshold effort 8 as successful execution that should be repeated", () => {
    const prompt = scenarioPrompt({ workoutKind: "threshold_run", isStroller: false, runType: "outdoor", isCalibration: false, hasChartEvidence: true });
    expect(prompt).toContain("separate successful execution from progression");
    expect(prompt).toContain("8/10 is successful execution");
  });
});
