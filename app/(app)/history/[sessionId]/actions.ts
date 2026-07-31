"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateRunSession, updateStrengthSession } from "@/lib/services/editService";
import type { CompletionState, ExpectationResult, RunType } from "@/domain/types";

export interface EditFormState {
  error?: string;
  saved?: boolean;
  recalculated?: boolean;
  message?: string;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export async function saveRunEdit(_prev: EditFormState, formData: FormData): Promise<EditFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Missing workout id." };

  const durationMinutes = optionalNumber(formData.get("durationMinutes"));
  const paceOverrideMinutes = optionalNumber(formData.get("paceOverrideMinutes"));
  const completionState = String(formData.get("completionState") ?? "full") as CompletionState;
  const isStroller = formData.get("isStroller") === "on";
  const runType = String(formData.get("runType") ?? "outdoor") as RunType;
  if (isStroller && runType === "treadmill") {
    return { error: "A jogging-stroller run must use the outdoor or run-walk environment." };
  }

  try {
    const change = await updateRunSession(supabase, user.id, sessionId, {
      runType,
      isStroller,
      strollerDiscomfortAreas: isStroller
        ? formData.getAll("strollerDiscomfortAreas").map(String)
        : [],
      distanceMiles: optionalNumber(formData.get("distanceMiles")),
      durationSeconds: durationMinutes === null ? null : Math.round(durationMinutes * 60),
      paceOverrideSecondsPerMile: paceOverrideMinutes === null ? null : Math.round(paceOverrideMinutes * 60),
      averageHr: optionalNumber(formData.get("averageHr")),
      maximumHr: optionalNumber(formData.get("maximumHr")),
      elevationGainFeet: optionalNumber(formData.get("elevationGainFeet")),
      overallEffort: Number(formData.get("overallEffort") ?? 5),
      highestKneeDuring: Number(formData.get("highestKneeDuring") ?? 0),
      kneeImmediatelyAfter: Number(formData.get("kneeImmediatelyAfter") ?? 0),
      completedFull: completionState === "full",
      completionState,
      expectationResult: String(formData.get("expectationResult") ?? "as_expected") as ExpectationResult,
      unusualPainFlag: formData.get("unusualPainFlag") === "on",
      notes: String(formData.get("notes") ?? "") || null,
    });

    revalidatePath("/history");
    revalidatePath(`/history/${sessionId}`);
    revalidatePath(`/history/${sessionId}/analysis`);
    revalidatePath("/progress");
    revalidatePath("/plan");
    revalidatePath("/today");

    return {
      saved: true,
      recalculated: change.isMaterial,
      message: change.isMaterial
        ? change.explanation ?? "Saved and recalculated."
        : "Saved. Nothing material changed, so the plan was left alone.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save changes." };
  }
}

export async function saveStrengthEdit(_prev: EditFormState, formData: FormData): Promise<EditFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Missing workout id." };

  const logIds = formData.getAll("strengthLogId").map(String);
  const completionState = String(formData.get("completionState") ?? "full") as CompletionState;

  const entries = logIds.map((strengthLogId, i) => {
    const loadType = String(formData.get(`loadType_${i}`) ?? "weighted") as
      | "weighted"
      | "bodyweight"
      | "band"
      | "machine";
    const rawBand = String(formData.get(`bandLevel_${i}`) ?? "").trim();
    const metric = String(formData.get(`metric_${i}`) ?? "reps");
    const result = optionalNumber(formData.get(`reps_${i}`));
    return {
      strengthLogId,
      completedSets: optionalNumber(formData.get(`sets_${i}`)),
      representativeReps: metric === "reps" || metric === "breaths" ? result : null,
      completedSeconds: metric === "seconds" ? result : null,
      completedDistanceFeet: metric === "distance_feet" ? result : null,
      completedSteps: metric === "steps" ? result : null,
      prescriptionMetric: metric as "reps" | "seconds" | "distance_feet" | "steps" | "breaths",
      loadValue:
        loadType === "weighted" || loadType === "machine" ? optionalNumber(formData.get(`load_${i}`)) : null,
      loadType,
      bandLevel: loadType === "band" && rawBand !== "" ? (rawBand as "light" | "medium" | "heavy") : null,
      difficulty: optionalNumber(formData.get(`difficulty_${i}`)),
    };
  });

  try {
    const change = await updateStrengthSession(supabase, user.id, sessionId, {
      entries,
      overallEffort: Number(formData.get("overallEffort") ?? 5),
      highestKneeDuring: Number(formData.get("highestKneeDuring") ?? 0),
      kneeImmediatelyAfter: Number(formData.get("kneeImmediatelyAfter") ?? 0),
      completedFull: completionState === "full",
      completionState,
      expectationResult: String(formData.get("expectationResult") ?? "as_expected") as ExpectationResult,
      unusualPainFlag: formData.get("unusualPainFlag") === "on",
      notes: String(formData.get("notes") ?? "") || null,
    });

    revalidatePath("/history");
    revalidatePath(`/history/${sessionId}`);
    revalidatePath("/progress");
    revalidatePath("/plan");
    revalidatePath("/today");

    return {
      saved: true,
      recalculated: change.isMaterial,
      message: change.isMaterial
        ? change.explanation ?? "Saved and recalculated."
        : "Saved. Nothing material changed, so the plan was left alone.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save changes." };
  }
}
