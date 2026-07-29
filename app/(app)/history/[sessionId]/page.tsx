import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionDetail } from "@/lib/services/historyService";
import { RunEditForm } from "./run-edit-form";
import { StrengthEditForm } from "./strength-edit-form";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const detail = await getSessionDetail(supabase, user!.id, sessionId);
  if (!detail) notFound();

  const dateLabel = new Date(`${detail.session.local_date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/history" className="text-sm text-slate-500 underline">
          ← Back to history
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Edit {dateLabel}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Correcting knee scores, effort, completion, distance/duration, or load recalculates the plan and is
          recorded in the audit history. Editing only the notes changes nothing else.
        </p>
      </div>

      {detail.session.session_type === "run" ? (
        <RunEditForm detail={detail} />
      ) : detail.session.session_type === "strength" ? (
        <StrengthEditForm detail={detail} />
      ) : (
        <div className="card">
          <p className="text-sm text-slate-600">
            This is a {detail.session.session_type.replace("_", " ")} session. Editing is currently supported
            for run and strength workouts.
          </p>
        </div>
      )}
    </div>
  );
}
