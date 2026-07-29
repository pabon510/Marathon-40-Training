import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ExerciseDefinitionRow,
  PostWorkoutCheckInRow,
  RunLogRow,
  StrengthLogRow,
  WorkoutSessionRow,
} from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface SessionListItem {
  session: WorkoutSessionRow;
  summary: string;
}

function runSummary(log: RunLogRow | undefined): string {
  if (!log) return "Run (no details recorded)";
  const parts: string[] = [];
  if (log.distance_miles !== null) parts.push(`${log.distance_miles} mi`);
  if (log.duration_seconds !== null) parts.push(`${Math.round(log.duration_seconds / 60)} min`);
  if (log.average_hr !== null) parts.push(`${log.average_hr} bpm avg`);
  return parts.length > 0 ? parts.join(" · ") : "Run (no details recorded)";
}

export async function getRecentSessions(
  supabase: Client,
  userId: string,
  limit = 40,
): Promise<SessionListItem[]> {
  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("local_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const [{ data: runLogs }, { data: strengthLogs }] = await Promise.all([
    supabase.from("run_logs").select("*").in("workout_session_id", sessionIds),
    supabase.from("strength_logs").select("workout_session_id").in("workout_session_id", sessionIds),
  ]);

  const runBySession = new Map((runLogs ?? []).map((l) => [l.workout_session_id, l]));
  const strengthCount = new Map<string, number>();
  for (const log of strengthLogs ?? []) {
    strengthCount.set(log.workout_session_id, (strengthCount.get(log.workout_session_id) ?? 0) + 1);
  }

  return sessions.map((session) => {
    let summary: string;
    if (session.session_type === "run") {
      summary = runSummary(runBySession.get(session.id));
    } else if (session.session_type === "strength") {
      const count = strengthCount.get(session.id) ?? 0;
      summary = `${count} exercise${count === 1 ? "" : "s"} logged`;
    } else {
      summary = session.session_type.replace("_", " ");
    }
    return { session, summary };
  });
}

export interface StrengthLogWithExercise extends StrengthLogRow {
  exercise: Pick<
    ExerciseDefinitionRow,
    "id" | "name" | "load_basis" | "default_load_type" | "rep_basis" | "loading_instructions"
  >;
}

export interface SessionDetail {
  session: WorkoutSessionRow;
  runLog: RunLogRow | null;
  strengthLogs: StrengthLogWithExercise[];
  postCheckIn: PostWorkoutCheckInRow | null;
}

/** Loads one session and everything attached to it. RLS restricts this to the caller's own rows. */
export async function getSessionDetail(
  supabase: Client,
  userId: string,
  sessionId: string,
): Promise<SessionDetail | null> {
  const { data: session, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;

  const [{ data: runLog }, { data: strengthLogs }, { data: postCheckIn }] = await Promise.all([
    supabase.from("run_logs").select("*").eq("workout_session_id", sessionId).maybeSingle(),
    supabase.from("strength_logs").select("*").eq("workout_session_id", sessionId).order("ordinal"),
    supabase.from("post_workout_check_ins").select("*").eq("workout_session_id", sessionId).maybeSingle(),
  ]);

  const exerciseIds = [...new Set((strengthLogs ?? []).map((l) => l.exercise_id))];
  const exerciseById = new Map<string, ExerciseDefinitionRow>();
  if (exerciseIds.length > 0) {
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercise_definitions")
      .select("*")
      .in("id", exerciseIds);
    if (exercisesError) throw exercisesError;
    for (const ex of exercises ?? []) exerciseById.set(ex.id, ex);
  }

  const withExercises: StrengthLogWithExercise[] = (strengthLogs ?? []).flatMap((log) => {
    const ex = exerciseById.get(log.exercise_id);
    if (!ex) return [];
    return [
      {
        ...log,
        exercise: {
          id: ex.id,
          name: ex.name,
          load_basis: ex.load_basis,
          default_load_type: ex.default_load_type,
          rep_basis: ex.rep_basis,
          loading_instructions: ex.loading_instructions,
        },
      },
    ];
  });

  return {
    session,
    runLog: runLog ?? null,
    strengthLogs: withExercises,
    postCheckIn: postCheckIn ?? null,
  };
}
