export const EFFORT_SCALE: Readonly<Record<number, string>> = {
  1: "Extremely easy",
  2: "Very easy",
  3: "Easy",
  4: "Comfortable",
  5: "Moderate",
  6: "Moderately hard",
  7: "Hard but controlled",
  8: "Very hard",
  9: "Nearly maximal",
  10: "Maximal",
};

export const KNEE_SCALE: Readonly<Record<number, string>> = {
  0: "No discomfort",
  1: "Barely noticeable",
  2: "Mild",
  3: "Noticeable",
  4: "Moderate",
  5: "Significant",
  6: "High — running and lower-body work blocked",
  7: "Severe",
  8: "Very severe",
  9: "Extreme",
  10: "Worst imaginable",
};

export const DIFFICULTY_SCALE: Readonly<Record<number, string>> = {
  1: "Extremely easy — more than 5 reps left",
  2: "Very easy — about 5 reps left",
  3: "Easy — about 4–5 reps left",
  4: "Comfortable — about 4 reps left",
  5: "Moderate — about 3–4 reps left",
  6: "Moderately hard — about 3 reps left",
  7: "Challenging — about 2–3 reps left",
  8: "Very hard — about 1–2 reps left",
  9: "Nearly maximal — about 0–1 reps left",
  10: "Maximal — no reps left",
};

export function isScaleScore(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
