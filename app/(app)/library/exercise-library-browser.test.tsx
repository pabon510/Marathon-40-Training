import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildExerciseLibraryEntries } from "@/domain/content/exerciseLibraryBrowser";
import { ExerciseLibraryBrowser } from "./exercise-library-browser";

describe("ExerciseLibraryBrowser", () => {
  it("searches the catalogue and clears all filters", () => {
    const entries = buildExerciseLibraryEntries();
    render(<ExerciseLibraryBrowser entries={entries} initialPreferences={{}} />);

    const search = screen.getByRole("searchbox", { name: "Search exercises" });
    fireEvent.change(search, { target: { value: "Wall-supported tibialis raise" } });

    expect(screen.getByText("Wall-supported tibialis raise")).toBeInTheDocument();
    expect(screen.getByText("1 exercise")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(search).toHaveValue("");
    expect(screen.getByText(`${entries.length} exercises`)).toBeInTheDocument();
  });

  it("shows a helpful empty state for incompatible filters", () => {
    render(<ExerciseLibraryBrowser entries={buildExerciseLibraryEntries()} initialPreferences={{}} />);
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "home" } });
    fireEvent.change(screen.getByLabelText("Equipment"), {
      target: { value: "standing calf raise machine" },
    });
    expect(screen.getByText("No exercises match those filters.")).toBeInTheDocument();
  });
});
