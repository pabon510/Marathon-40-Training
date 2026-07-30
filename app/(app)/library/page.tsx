import { buildExerciseLibraryEntries } from "@/domain/content/exerciseLibraryBrowser";
import { ExerciseLibraryBrowser } from "./exercise-library-browser";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const { exercise } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data: preferences } = await supabase
    .from("exercise_preferences")
    .select("exercise_slug, preference")
    .eq("user_id", user!.id);
  const initialPreferences = Object.fromEntries(
    (preferences ?? []).map((row) => [row.exercise_slug, row.preference]),
  );
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Exercise library</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review exercise setup, form guidance, loading, and approved alternatives.
        </p>
      </div>
      <ExerciseLibraryBrowser
        entries={buildExerciseLibraryEntries()}
        initialExerciseSlug={exercise}
        initialPreferences={initialPreferences}
      />
    </div>
  );
}
