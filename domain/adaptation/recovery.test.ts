import { describe, expect, it } from "vitest";
import { computeRecoverySignals, evaluateGeneralRecovery, type RecoveryInputs } from "./recovery";

function baseInputs(overrides: Partial<RecoveryInputs> = {}): RecoveryInputs {
  return {
    energy: 3,
    soreness: 2,
    fatigue: 3,
    hoursSlept: 7.5,
    ouraScore: null,
    recentOuraAverage: null,
    poorRecoveryYesterday: false,
    ...overrides,
  };
}

describe("computeRecoverySignals", () => {
  it("flags low oura alone as one signal, not poor recovery by itself", () => {
    const signals = computeRecoverySignals(baseInputs({ ouraScore: 60 }));
    expect(signals.poorOura).toBe(true);
    expect(signals.signalCount).toBe(1);
    expect(signals.poorRecoveryPresent).toBe(false);
  });

  it("flags oura at least 12 below recent average even if score itself is high", () => {
    const signals = computeRecoverySignals(
      baseInputs({ ouraScore: 78, recentOuraAverage: 91 }),
    );
    expect(signals.poorOura).toBe(true);
  });
});

describe("evaluateGeneralRecovery", () => {
  it("case 7: low oura alone does not reduce training", () => {
    const result = evaluateGeneralRecovery(baseInputs({ ouraScore: 60, fatigue: 3 }));
    expect(result.category).toBe("full");
    expect(result.progressionAllowed).toBe(true);
  });

  it("case 7: energy 1 + low oura + fatigue 4 reduces training", () => {
    const result = evaluateGeneralRecovery(
      baseInputs({ energy: 1, ouraScore: 60, fatigue: 4 }),
    );
    expect(result.category).not.toBe("full");
    expect(result.progressionAllowed).toBe(false);
    expect(result.reasonCode).toBe("RECOVERY_MULTI_SIGNAL");
  });

  it("case 8: high stress alone does not reduce (stress is not a recovery signal input)", () => {
    // Stress isn't part of the poor-recovery signal set at all per the
    // product rules — it is displayed/stored only.
    const result = evaluateGeneralRecovery(baseInputs({ fatigue: 5 }));
    expect(result.category).toBe("full");
  });

  it("one poor night alone (only sleep signal) does not reduce even with high fatigue", () => {
    const result = evaluateGeneralRecovery(baseInputs({ hoursSlept: 5, fatigue: 5 }));
    expect(result.category).toBe("full");
  });

  it("two signals present but fatigue normal does not reduce", () => {
    const result = evaluateGeneralRecovery(
      baseInputs({ energy: 2, soreness: 4, fatigue: 3 }),
    );
    expect(result.category).toBe("full");
  });

  it("moderate poor recovery (2 signals) shortens/downgrades to easy_cap", () => {
    const result = evaluateGeneralRecovery(
      baseInputs({ energy: 2, soreness: 4, fatigue: 4 }),
    );
    expect(result.category).toBe("easy_cap");
  });

  it("severe poor recovery (3+ signals) drops to upper_core_only", () => {
    const result = evaluateGeneralRecovery(
      baseInputs({ energy: 1, soreness: 5, hoursSlept: 4, fatigue: 5 }),
    );
    expect(result.category).toBe("upper_core_only");
  });

  it("multi-day poor recovery escalates to upper_core_only even with only 2 signals today", () => {
    const result = evaluateGeneralRecovery(
      baseInputs({ energy: 2, soreness: 4, fatigue: 4, poorRecoveryYesterday: true }),
    );
    expect(result.category).toBe("upper_core_only");
  });
});
