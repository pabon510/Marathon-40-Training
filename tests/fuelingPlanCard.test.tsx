import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildFuelingPlan } from "@/domain/fueling/fuelingPlan";
import { FuelingPlanCard } from "@/components/fueling-plan-card";

const profile = {
  bodyWeightKg: 80,
  typicalDailyCaffeineMg: 100,
  caffeineSensitivity: "normal" as const,
  caffeineCutoffHour: 14,
  dietaryRestrictions: [],
  lactoseTolerant: true,
  workoutTimingPreference: "standard" as const,
};

describe("FuelingPlanCard", () => {
  it("shows familiar products and distinguishes caffeine", () => {
    render(<FuelingPlanCard plan={buildFuelingPlan("long_run", 70, profile)} />);
    expect(screen.getByText("Fuel this workout")).toBeInTheDocument();
    expect(screen.getByText(/Maurten Gel 100: 1 planned/)).toBeInTheDocument();
    expect(screen.getByText(/1 bottle = 30 g protein/)).toBeInTheDocument();
    expect(screen.getByText(/Each Gel 100 CAF 100 adds 100 mg caffeine/)).toBeInTheDocument();
  });

  it("does not display sports fueling on a recovery day", () => {
    const { container } = render(<FuelingPlanCard plan={buildFuelingPlan("active_recovery", 20, profile)} />);
    expect(container).toBeEmptyDOMElement();
  });
});
