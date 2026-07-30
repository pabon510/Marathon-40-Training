import { buildExerciseLibraryEntries } from "@/domain/content/exerciseLibraryBrowser";
import { ExerciseLibraryBrowser } from "./exercise-library-browser";

export default function ExerciseLibraryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Exercise library</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review exercise setup, form guidance, loading, and approved alternatives.
        </p>
      </div>
      <ExerciseLibraryBrowser entries={buildExerciseLibraryEntries()} />
    </div>
  );
}

