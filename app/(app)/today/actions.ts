"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { submitCheckInAndRecalculate } from "@/lib/services/checkinService";
import { todayLocalDate } from "@/lib/date";
import type { AvailableTime } from "@/domain/types";

export interface CheckInFormState {
  error?: string;
}

function parseScale(value: FormDataEntryValue | null): 1 | 2 | 3 | 4 | 5 | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return n >= 1 && n <= 5 ? (n as 1 | 2 | 3 | 4 | 5) : null;
}

export async function submitCheckInAction(_prev: CheckInFormState, formData: FormData): Promise<CheckInFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "No profile found." };

  const localDate = todayLocalDate(profile.timezone);
  const skippedFields: string[] = [];

  const hoursSleptRaw = String(formData.get("hoursSlept") ?? "");
  const hoursSleptSkipped = formData.get("hoursSleptSkip") === "on";
  if (hoursSleptSkipped) skippedFields.push("hoursSlept");
  const hoursSlept = hoursSleptSkipped || hoursSleptRaw === "" ? null : Number(hoursSleptRaw);

  const ouraRaw = String(formData.get("ouraScore") ?? "");
  const ouraScore = ouraRaw === "" ? null : Number(ouraRaw);

  const kneeRaw = String(formData.get("knee") ?? "");
  const kneeSkipped = formData.get("kneeSkip") === "on";
  if (kneeSkipped) skippedFields.push("knee");
  const knee = kneeSkipped || kneeRaw === "" ? null : Number(kneeRaw);

  for (const field of ["energy", "soreness", "stress", "fatigue"]) {
    if (formData.get(`${field}Skip`) === "on") skippedFields.push(field);
  }

  const availableTime = String(formData.get("availableTime") ?? "45") as AvailableTime;
  const strengthLocationRaw = String(formData.get("strengthLocation") ?? "");
  const strengthLocation = strengthLocationRaw === "gym" || strengthLocationRaw === "home" ? strengthLocationRaw : null;

  try {
    await submitCheckInAndRecalculate(supabase, user.id, {
      localDate,
      hoursSlept,
      ouraScore,
      energy: parseScale(formData.get("energy")),
      soreness: parseScale(formData.get("soreness")),
      stress: parseScale(formData.get("stress")),
      fatigue: parseScale(formData.get("fatigue")),
      knee,
      availableTime,
      strengthLocation,
      skippedFields,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to submit check-in." };
  }

  revalidatePath("/today");
  revalidatePath("/plan");
  return {};
}
