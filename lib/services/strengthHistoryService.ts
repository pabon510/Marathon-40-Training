import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ExerciseExposure } from "@/domain/progression/loadRecommendation";

type Client = SupabaseClient<Database>;

/** How many past strength sessions to scan when building per-exercise history. */
const SESSION_LOOKBACK = 60;

/**
 * Returns the most recent exposures per exercise (newest first), for the
 * exercises in `exerciseIds`. Done as two simple queries rather than a
 * PostgREST embed so the result stays plainly typed; the single-user data
 * volume here is tiny.
 */
export async function getRecentExerciseHistory(
  supabase: Client,
  userId: string,
  exerciseIds: string[],
  perExerciseLimit = 2,
): Promise<Map<string, ExerciseExposure[]>> {
  const result = new Map<string, ExerciseExposure[]>();
  if (exerciseIds.length === 0) return result;

  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("id, local_date")
    .eq("user_id", userId)
    .eq("session_type", "strength")
    .order("local_date", { ascending: false })
    .limit(SESSION_LOOKBACK);
  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return result;

  const dateBySession = new Map(sessions.map((s) => [s.id, s.local_date]));

  const { data: logs, error: logsError } = await supabase
    .from("strength_logs")
    .select("*")
    .in("workout_session_id", [...dateBySession.keys()])
    .in("exercise_id", exerciseIds);
  if (logsError) throw logsError;

  for (const log of logs ?? []) {
    const localDate = dateBySession.get(log.workout_session_id);
    if (!localDate) continue;
    const list = result.get(log.exercise_id) ?? [];
    // `?? null` normalizes columns that may be absent entirely if migration
    // 0008 has not been applied yet, so history still reads correctly.
    list.push({
      localDate,
      loadValue: log.load_value ?? null,
      loadType: log.load_type ?? null,
      bandLevel: log.band_level ?? null,
      completedSets: log.completed_sets ?? null,
      representativeReps: log.representative_reps ?? null,
      difficulty: log.difficulty ?? null,
      repBasis: log.rep_basis ?? null,
      painIncreased: log.pain_increased ?? null,
      formFailed: log.form_failed ?? null,
      recoveryAcceptable: log.recovery_acceptable ?? null,
    });
    result.set(log.exercise_id, list);
  }

  for (const [exerciseId, list] of result) {
    list.sort((a, b) => b.localDate.localeCompare(a.localDate));
    result.set(exerciseId, list.slice(0, perExerciseLimit));
  }

  return result;
}
