import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LabeledScale } from "@/components/labeled-scale";
import { EFFORT_SCALE, KNEE_SCALE } from "@/domain/content/trainingScales";

describe("LabeledScale", () => {
  it("starts unanswered and exposes both the number and definition after selection", () => {
    const onChange = vi.fn();
    render(
      <LabeledScale
        label="Overall effort"
        name="effort"
        min={1}
        max={10}
        labels={EFFORT_SCALE}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Not answered")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Overall effort: 7, Hard but controlled" }));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("labels the knee hard-stop threshold explicitly", () => {
    render(
      <LabeledScale
        label="Knee discomfort"
        name="knee"
        min={0}
        max={10}
        labels={KNEE_SCALE}
        defaultValue={6}
      />,
    );
    expect(screen.getByText("6/10 — High — running and lower-body work blocked")).toBeInTheDocument();
  });
});
