import { buildExerciseLibraryEntries } from "@/domain/content/exerciseLibraryBrowser";
import { ExerciseLibraryBrowser } from "./exercise-library-browser";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import Link from "next/link";

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string; returnTo?: string }>;
}) {
  const { exercise, returnTo } = await searchParams;
  const safeReturnTo = returnTo === "/log/strength" ? returnTo : null;
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
        {safeReturnTo ? <Link href={safeReturnTo} className="mb-3 inline-flex min-h-touch items-center text-sm font-semibold text-brand-700 underline">← Return to workout</Link> : null}
        <h1 className="text-xl font-bold text-slate-900">Exercise library</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review strength exercises, recovery movements, form guidance, and approved alternatives.
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
