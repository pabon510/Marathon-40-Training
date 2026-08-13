import { describe, expect, it } from "vitest";
import { buildRunPrescription } from "./planService";
import { structuredRunDurationMinutes } from "@/domain/running/structuredRun";

describe("threshold run prescription", () => {
  it("accounts for every displayed minute", () => {
    const prescription = buildRunPrescription(
      "threshold_run",
      { easy_hr_floor: 140, easy_hr_ceiling: 150 },
      false,
    );
    expect(prescription).not.toBeNull();
    expect(structuredRunDurationMinutes(prescription!)).toBe(prescription!.durationMinutes);
    expect(prescription).toEqual(expect.objectContaining({ warmupMinutes: 5, cooldownMinutes: 4 }));
    expect(prescription?.intervals?.[0]).toEqual(expect.objectContaining({ repeats: 4, recoveryRepeats: 3 }));
  });
});
