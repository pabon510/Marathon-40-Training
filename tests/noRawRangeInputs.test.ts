import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith(".tsx")
        ? [path]
        : [];
  });
}

describe("scale controls", () => {
  it("does not allow unlabeled raw range inputs in application screens", () => {
    const offenders = [...sourceFiles("app"), ...sourceFiles("components")]
      .filter((path) => readFileSync(path, "utf8").includes('type="range"'));
    expect(offenders).toEqual([]);
  });
});
