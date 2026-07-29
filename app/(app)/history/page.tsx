import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getRecentSessions } from "@/lib/services/historyService";

const TYPE_LABELS: Record<string, string> = {
  run: "Run",
  strength: "Strength",
  cross_training: "Cross training",
  mobility: "Mobility",
  rest_active: "Active rest",
};

const STATE_LABELS: Record<string, string> = {
  full: "Completed",
  partial: "Partial",
  stopped: "Stopped",
  skipped: "Skipped",
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const sessions = await getRecentSessions(supabase, user!.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Workout history</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tap any workout to correct what you logged. Changing knee scores, effort, completion,
          distance/duration, or load recalculates the plan; editing only the notes does not.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-500">No workouts logged yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map(({ session, summary }) => (
            <li key={session.id}>
              <Link
                href={`/history/${session.id}`}
                className="card flex min-h-touch items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(`${session.local_date}T00:00:00Z`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}{" "}
                    · {TYPE_LABELS[session.session_type] ?? session.session_type}
                    {session.unplanned ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">unplanned</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-slate-500">{summary}</p>
                </div>
                <span
                  className={
                    session.completion_state === "full"
                      ? "badge-ok shrink-0"
                      : session.completion_state === "skipped"
                        ? "badge-block shrink-0"
                        : "badge-warn shrink-0"
                  }
                >
                  {STATE_LABELS[session.completion_state] ?? session.completion_state}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
