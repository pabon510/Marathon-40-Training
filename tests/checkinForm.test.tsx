import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { CheckInFormView } from "@/app/(app)/today/checkin-form";
import { parseCheckInFormData } from "@/app/(app)/today/parseCheckIn";

afterEach(cleanup);

/**
 * Renders the check-in with a stub action, and captures the FormData the form
 * would post. Going through the real parser afterwards means these tests
 * assert on what would actually be *stored*, not just on what is on screen.
 */
function renderForm(props: { needsLocation?: boolean; rememberedLocation?: "gym" | "home" | null } = {}) {
  const action = vi.fn<(formData: FormData) => void>();
  render(
    <CheckInFormView
      needsLocation={props.needsLocation ?? false}
      rememberedLocation={props.rememberedLocation ?? null}
      state={{}}
      action={action}
      pending={false}
    />,
  );
  return {
    action,
    submit: () => fireEvent.click(screen.getByRole("button", { name: "Submit check-in" })),
    /** What the parser would store from the most recent submission. */
    stored: () => {
      const formData = action.mock.calls.at(-1)?.[0];
      if (!formData) throw new Error("the form was never submitted");
      const result = parseCheckInFormData(formData);
      if (!result.ok) throw new Error(`unexpected validation failure: ${result.error}`);
      return result.value;
    },
  };
}

/** Picks a numbered option inside one labelled group (e.g. "3" under "Energy"). */
function choose(groupName: string, option: string) {
  const group = screen.getByRole("group", { name: new RegExp(`^${groupName}`) });
  fireEvent.click(within(group).getByRole("radio", { name: option }));
}

describe("requirement 1: readiness fields begin unanswered", () => {
  it("shows every readiness metric as not answered on first render", () => {
    renderForm();

    for (const metric of ["Energy", "Soreness", "Stress", "Fatigue"]) {
      const group = screen.getByRole("group", { name: new RegExp(`^${metric}`) });
      expect(within(group).getByText("Not answered")).toBeInTheDocument();
    }
  });

  it("leaves every readiness, knee and time radio unchecked", () => {
    renderForm();

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeChecked();
    }
  });

  it("shows knee discomfort as not answered rather than as 0", () => {
    renderForm();

    expect(screen.getByText("Knee discomfort: not answered")).toBeInTheDocument();
    expect(screen.queryByText("Knee discomfort: 0/10")).not.toBeInTheDocument();
  });
});

describe("requirement 2: nothing is stored that was not explicitly selected", () => {
  it("stores null for every field left untouched", () => {
    const form = renderForm();

    form.submit();
    // Blanks raise the confirmation first; confirming is what actually posts.
    fireEvent.click(screen.getByRole("button", { name: "Submit with missing fields" }));

    const stored = form.stored();
    expect(stored.energy).toBeNull();
    expect(stored.soreness).toBeNull();
    expect(stored.stress).toBeNull();
    expect(stored.fatigue).toBeNull();
    expect(stored.knee).toBeNull();
  });

  it("stores only the metric that was actually tapped", () => {
    const form = renderForm();

    choose("Energy", "2");
    form.submit();
    fireEvent.click(screen.getByRole("button", { name: "Submit with missing fields" }));

    const stored = form.stored();
    expect(stored.energy).toBe(2);
    expect(stored.soreness).toBeNull();
    expect(stored.stress).toBeNull();
    expect(stored.fatigue).toBeNull();
  });
});

describe("requirement 3: selecting a score displays the matching definition", () => {
  it.each([
    ["Energy", "3", "Selected: 3, Normal"],
    ["Energy", "1", "Selected: 1, Depleted"],
    ["Energy", "5", "Selected: 5, Excellent"],
    ["Soreness", "4", "Selected: 4, High"],
    ["Soreness", "1", "Selected: 1, None"],
    ["Stress", "5", "Selected: 5, Overwhelming"],
    ["Stress", "1", "Selected: 1, Very low"],
    ["Fatigue", "2", "Selected: 2, Slightly tired"],
    ["Fatigue", "5", "Selected: 5, Exhausted"],
  ])("%s = %s reads as %s", (metric, option, expected) => {
    renderForm();

    choose(metric, option);

    const group = screen.getByRole("group", { name: new RegExp(`^${metric}`) });
    expect(within(group).getByText(expected)).toBeInTheDocument();
  });

  it("exposes the selected state to screen readers, not just visually", () => {
    renderForm();

    choose("Energy", "4");

    const group = screen.getByRole("group", { name: /^Energy/ });
    expect(within(group).getByRole("radio", { name: "4" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "3" })).not.toBeChecked();
  });

  it("lets a selection be cleared back to unanswered", () => {
    renderForm();

    choose("Energy", "4");
    const group = screen.getByRole("group", { name: /^Energy/ });
    fireEvent.click(within(group).getByRole("button", { name: "Clear" }));

    expect(within(group).getByText("Not answered")).toBeInTheDocument();
  });
});

describe("requirement 4: knee discomfort can explicitly be set to 0", () => {
  it("treats a tapped 0 as a real answer and stores it", () => {
    const form = renderForm();

    choose("Knee discomfort", "0");
    expect(screen.getByText("Knee discomfort: 0/10")).toBeInTheDocument();

    form.submit();
    fireEvent.click(screen.getByRole("button", { name: "Submit with missing fields" }));

    expect(form.stored().knee).toBe(0);
  });

  it("offers all eleven values", () => {
    renderForm();

    const group = screen.getByRole("group", { name: /^Knee discomfort/ });
    expect(within(group).getAllByRole("radio")).toHaveLength(11);
  });

  it("shows the selected value prominently", () => {
    renderForm();

    choose("Knee discomfort", "2");

    expect(screen.getByText("Knee discomfort: 2/10")).toBeInTheDocument();
  });
});

describe("requirement 5: skipping knee discomfort triggers the conservative fallback", () => {
  it("explains the non-running fallback while knee is unanswered", () => {
    renderForm();

    expect(
      screen.getByText("Today's plan will default to non-running until knee discomfort is confirmed."),
    ).toBeInTheDocument();
  });

  it("hides the notice once a knee score is given", () => {
    renderForm();

    choose("Knee discomfort", "3");

    expect(
      screen.queryByText("Today's plan will default to non-running until knee discomfort is confirmed."),
    ).not.toBeInTheDocument();
  });

  it("supports an explicit 'I don't know' that still stores null", () => {
    const form = renderForm();

    choose("Knee discomfort", "5");
    fireEvent.click(screen.getByRole("button", { name: "I don't know" }));

    expect(screen.getByRole("button", { name: "I don't know" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Knee discomfort: not answered")).toBeInTheDocument();

    form.submit();
    fireEvent.click(screen.getByRole("button", { name: "Submit with missing fields" }));
    expect(form.stored().knee).toBeNull();
  });

  it("spells out the safety consequence in the confirmation when knee is blank", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Submit check-in" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/conservative non-running fallback/)).toBeInTheDocument();
  });
});

describe("requirement 6: submitting with blanks requires one confirmation", () => {
  it("does not post until the confirmation is accepted", () => {
    const form = renderForm();

    form.submit();

    expect(form.action).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("lists exactly the two fields that were left blank", () => {
    renderForm();

    choose("Energy", "3");
    choose("Soreness", "2");
    choose("Fatigue", "2");
    choose("Knee discomfort", "1");
    choose("Available time", "45");
    fireEvent.change(screen.getByLabelText("Hours slept"), { target: { value: "7" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit check-in" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/You have not answered/)).toHaveTextContent(
      "You have not answered Oura Sleep Score and Stress. Submit anyway?",
    );
  });

  it("uses a serial comma once three or more fields are blank", () => {
    renderForm();

    choose("Soreness", "2");
    choose("Fatigue", "2");
    choose("Knee discomfort", "1");
    choose("Available time", "45");
    fireEvent.change(screen.getByLabelText("Hours slept"), { target: { value: "7" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit check-in" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/You have not answered/)).toHaveTextContent(
      "You have not answered Oura Sleep Score, Energy, and Stress. Submit anyway?",
    );
  });

  it("names a single blank field without any list punctuation", () => {
    renderForm();

    choose("Energy", "3");
    choose("Soreness", "2");
    choose("Stress", "2");
    choose("Fatigue", "2");
    choose("Knee discomfort", "1");
    choose("Available time", "45");
    fireEvent.change(screen.getByLabelText("Hours slept"), { target: { value: "7" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit check-in" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/You have not answered/)).toHaveTextContent(
      "You have not answered Oura Sleep Score. Submit anyway?",
    );
  });

  it("presents the confirmation as an overlay, not as an easily-missed inline block", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Submit check-in" }));

    // The submit button is sticky at the bottom of the viewport, so an
    // in-flow confirmation could render below the fold and never be seen.
    const backdrop = screen.getByRole("dialog").parentElement!;
    expect(backdrop.className).toContain("fixed");
    expect(backdrop.className).toContain("inset-0");
    // ...and the panel still clears the bottom nav.
    expect(screen.getByRole("dialog").style.marginBottom).toBe("var(--bottom-nav-h, 0px)");
  });

  it("'Go back' dismisses the confirmation without posting", () => {
    const form = renderForm();

    form.submit();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(form.action).not.toHaveBeenCalled();
  });

  it("'Submit with missing fields' posts once", () => {
    const form = renderForm();

    form.submit();
    fireEvent.click(screen.getByRole("button", { name: "Submit with missing fields" }));

    expect(form.action).toHaveBeenCalledTimes(1);
  });

  it("posts immediately when nothing is blank", () => {
    const form = renderForm();

    fireEvent.change(screen.getByLabelText("Hours slept"), { target: { value: "7.5" } });
    fireEvent.change(screen.getByLabelText("Oura score"), { target: { value: "82" } });
    choose("Energy", "4");
    choose("Soreness", "2");
    choose("Stress", "2");
    choose("Fatigue", "2");
    choose("Knee discomfort", "1");
    choose("Available time", "45");

    form.submit();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(form.action).toHaveBeenCalledTimes(1);

    const stored = form.stored();
    expect(stored).toMatchObject({
      hoursSlept: 7.5,
      ouraScore: 82,
      energy: 4,
      soreness: 2,
      stress: 2,
      fatigue: 2,
      knee: 1,
      availableTime: "45",
    });
    expect(stored.skippedFields).toEqual([]);
  });
});

describe("requirement 9: strength location only appears on strength days", () => {
  it("is absent on a run or rest day", () => {
    renderForm({ needsLocation: false });

    expect(screen.queryByRole("group", { name: /Strength location/ })).not.toBeInTheDocument();
  });

  it("is present on a strength day", () => {
    renderForm({ needsLocation: true });

    const group = screen.getByRole("group", { name: /Strength location/ });
    expect(within(group).getByRole("radio", { name: "gym" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "home" })).toBeInTheDocument();
  });

  it("remembers the location already chosen for today", () => {
    renderForm({ needsLocation: true, rememberedLocation: "gym" });

    const group = screen.getByRole("group", { name: /Strength location/ });
    expect(within(group).getByRole("radio", { name: "gym" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "home" })).not.toBeChecked();
  });
});

describe("requirement 10: the result state explains what happened", () => {
  it("renders an unchanged outcome with a way into the workout", () => {
    render(
      <CheckInFormView
        needsLocation={false}
        state={{
          outcome: {
            changed: false,
            blocked: false,
            headline: "Workout confirmed: Home Strength B, 45 minutes",
            detail: "No change was made. Recovery and knee scores were within the allowed range.",
            reason: null,
          },
        }}
        action={vi.fn()}
        pending={false}
      />,
    );

    expect(screen.getByText("Workout confirmed: Home Strength B, 45 minutes")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open today's workout" })).toHaveAttribute("href", "/workouts");
    // The form is replaced by the result, not shown alongside it.
    expect(screen.queryByRole("button", { name: "Submit check-in" })).not.toBeInTheDocument();
  });

  it("renders a changed outcome together with its reason", () => {
    render(
      <CheckInFormView
        needsLocation={false}
        state={{
          outcome: {
            changed: true,
            blocked: false,
            headline: "Today's run was replaced with upper-body and core work.",
            detail: "The plan below reflects the change. Nothing is owed or made up later.",
            reason: "Reason: Knee discomfort increased from 2 to 4.",
          },
        }}
        action={vi.fn()}
        pending={false}
      />,
    );

    expect(screen.getByText("Today's run was replaced with upper-body and core work.")).toBeInTheDocument();
    expect(screen.getByText("Reason: Knee discomfort increased from 2 to 4.")).toBeInTheDocument();
    expect(screen.getByText("Adjusted")).toBeInTheDocument();
  });
});

describe("requirement 12: the form holds up at iPhone widths", () => {
  const IPHONE_WIDTHS = [
    { name: "iPhone SE / 8", width: 375 },
    { name: "iPhone 14 / 15", width: 390 },
    { name: "iPhone 15 Pro Max", width: 430 },
  ];

  it.each(IPHONE_WIDTHS)("renders every control at $name ($width px)", ({ width }) => {
    window.innerWidth = width;
    renderForm({ needsLocation: true });

    // 4 readiness x 5 + 11 knee + 6 time + 2 location
    expect(screen.getAllByRole("radio")).toHaveLength(20 + 11 + 6 + 2);
    expect(screen.getByRole("button", { name: "Submit check-in" })).toBeInTheDocument();
  });

  it("gives every tappable choice a 44px minimum target", () => {
    const { container } = render(
      <CheckInFormView needsLocation state={{}} action={vi.fn()} pending={false} />,
    );

    const choices = container.querySelectorAll("label:has(input[type='radio'])");
    expect(choices.length).toBeGreaterThan(0);
    for (const choice of choices) {
      expect(choice.className).toContain("min-h-touch");
    }
  });

  it("lays the score rows out as fixed-column grids rather than free-flowing text", () => {
    const { container } = render(
      <CheckInFormView needsLocation state={{}} action={vi.fn()} pending={false} />,
    );

    // 5 columns for the 1-5 metrics, 6 for the wider knee/time rows.
    expect(container.querySelectorAll(".grid-cols-5").length).toBe(4);
    expect(container.querySelectorAll(".grid-cols-6").length).toBe(2);
  });

  it("declares no fixed pixel widths that could overflow a narrow screen", () => {
    const { container } = render(
      <CheckInFormView needsLocation state={{}} action={vi.fn()} pending={false} />,
    );

    for (const el of container.querySelectorAll<HTMLElement>("*")) {
      expect(el.style.width).toBe("");
      expect(el.style.minWidth).toBe("");
    }
  });
});

describe("requirement 13: the sticky submit clears the bottom navigation", () => {
  it("offsets itself by the shared bottom-nav height variable", () => {
    renderForm();

    const sticky = screen.getByTestId("sticky-submit");
    expect(sticky.className).toContain("sticky");
    // Pinning to bottom: 0 would put it underneath the fixed nav.
    expect(sticky.style.bottom).toBe("var(--bottom-nav-h, 0px)");
    expect(sticky.style.bottom).not.toBe("0px");
  });

  it("defines that variable from the real nav height plus the iPhone safe area", () => {
    const css = readFileSync("app/globals.css", "utf-8");

    expect(css).toMatch(/--bottom-nav-h:\s*calc\([^)]*env\(safe-area-inset-bottom\)\)/);
    // ...and collapses to zero once the bottom nav is hidden at md and up.
    expect(css).toMatch(/min-width:\s*768px[\s\S]*--bottom-nav-h:\s*0px/);
  });

  it("keeps the submit button reachable rather than scrolled away", () => {
    renderForm();

    const sticky = screen.getByTestId("sticky-submit");
    expect(within(sticky).getByRole("button", { name: "Submit check-in" })).toBeInTheDocument();
  });
});
