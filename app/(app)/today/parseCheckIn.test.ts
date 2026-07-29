import { describe, expect, it } from "vitest";
import { parseCheckInFormData, type ParsedCheckIn } from "./parseCheckIn";

/** Builds FormData the way the check-in form actually posts it. */
function formData(entries: Record<string, string> = {}): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

function parseOk(entries: Record<string, string> = {}): ParsedCheckIn {
  const result = parseCheckInFormData(formData(entries));
  if (!result.ok) throw new Error(`expected a successful parse, got: ${result.error}`);
  return result.value;
}

describe("requirement 2: no score is stored unless it was explicitly selected", () => {
  it("parses a completely untouched form to all-null readiness values", () => {
    const value = parseOk();

    expect(value.energy).toBeNull();
    expect(value.soreness).toBeNull();
    expect(value.stress).toBeNull();
    expect(value.fatigue).toBeNull();
    expect(value.knee).toBeNull();
    expect(value.hoursSlept).toBeNull();
    expect(value.ouraScore).toBeNull();
  });

  it("never substitutes a neutral 3 for an unanswered readiness field", () => {
    const value = parseOk({ energy: "5" });

    expect(value.energy).toBe(5);
    expect(value.soreness).toBeNull();
    expect(value.stress).toBeNull();
    expect(value.fatigue).toBeNull();
  });

  it("records every unanswered field so the audit trail shows what was skipped", () => {
    const value = parseOk({ energy: "3" });

    expect(value.skippedFields).toContain("soreness");
    expect(value.skippedFields).toContain("stress");
    expect(value.skippedFields).toContain("fatigue");
    expect(value.skippedFields).toContain("knee");
    expect(value.skippedFields).toContain("hoursSlept");
    expect(value.skippedFields).not.toContain("energy");
  });
});

describe("requirement 4: knee discomfort distinguishes 0 from unanswered", () => {
  it("stores an explicit 0 as a real answer", () => {
    const value = parseOk({ knee: "0" });

    expect(value.knee).toBe(0);
    expect(value.skippedFields).not.toContain("knee");
  });

  it("stores a skipped knee as null, never as 0", () => {
    const value = parseOk({ energy: "3" });

    expect(value.knee).toBeNull();
    expect(value.knee).not.toBe(0);
    expect(value.skippedFields).toContain("knee");
  });

  it("accepts the whole 0-10 range", () => {
    for (const n of [0, 1, 5, 9, 10]) {
      expect(parseOk({ knee: String(n) }).knee).toBe(n);
    }
  });
});

describe("validation stays in plain language", () => {
  it("rejects an out-of-range knee score", () => {
    const result = parseCheckInFormData(formData({ knee: "11" }));
    expect(result).toEqual({ ok: false, error: "Knee discomfort should be a whole number from 0 to 10." });
  });

  it("rejects an out-of-range readiness score", () => {
    const result = parseCheckInFormData(formData({ energy: "7" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Readiness answers should each be a whole number from 1 to 5.");
  });

  it("rejects an impossible amount of sleep", () => {
    const result = parseCheckInFormData(formData({ hoursSlept: "30" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Hours slept should be a number between 0 and 24.");
  });

  it("accepts decimal hours slept", () => {
    expect(parseOk({ hoursSlept: "6.5" }).hoursSlept).toBe(6.5);
  });

  it("rejects an Oura score outside 0-100", () => {
    const result = parseCheckInFormData(formData({ ouraScore: "101" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Oura sleep score should be a whole number between 0 and 100.");
  });

  it("accepts the Oura boundaries", () => {
    expect(parseOk({ ouraScore: "0" }).ouraScore).toBe(0);
    expect(parseOk({ ouraScore: "100" }).ouraScore).toBe(100);
  });

  it("rejects an unsupported available-time option", () => {
    const result = parseCheckInFormData(formData({ availableTime: "23" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Please choose one of the available time options.");
  });

  it("uses no technical wording in any validation message", () => {
    const bad: Record<string, string>[] = [
      { knee: "11" },
      { energy: "7" },
      { hoursSlept: "30" },
      { ouraScore: "101" },
      { availableTime: "23" },
    ];
    for (const entries of bad) {
      const result = parseCheckInFormData(formData(entries));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).not.toMatch(/null|undefined|NaN|parse|invalid input|schema|integer overflow/i);
      }
    }
  });
});

describe("requirement 7: strength location is required only when it applies", () => {
  it("is optional on a non-strength day", () => {
    const value = parseOk({ needsLocation: "false" });
    expect(value.strengthLocation).toBeNull();
  });

  it("is required on a strength day", () => {
    const result = parseCheckInFormData(formData({ needsLocation: "true" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Please choose gym or home for today's strength workout.");
  });

  it("accepts gym or home on a strength day", () => {
    expect(parseOk({ needsLocation: "true", strengthLocation: "gym" }).strengthLocation).toBe("gym");
    expect(parseOk({ needsLocation: "true", strengthLocation: "home" }).strengthLocation).toBe("home");
  });
});

describe("an unanswered available time never silently shortens training", () => {
  it("falls back to the only option that imposes no cap, and records the skip", () => {
    const value = parseOk();

    expect(value.availableTime).toBe("90_plus");
    expect(value.availableMinutes).toBeNull();
    expect(value.skippedFields).toContain("availableTime");
  });

  it("keeps an explicitly chosen time and its minute value", () => {
    const value = parseOk({ availableTime: "30" });

    expect(value.availableTime).toBe("30");
    expect(value.availableMinutes).toBe(30);
    expect(value.skippedFields).not.toContain("availableTime");
  });
});
