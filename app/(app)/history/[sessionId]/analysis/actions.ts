"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "garmin-run-screenshots";

export async function keepScreenshotsAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const importId = String(formData.get("importId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  await supabase.from("run_import_images").update({ keep_permanently: true }).eq("run_import_id", importId).eq("user_id", user.id).is("deleted_at", null);
  revalidatePath(`/history/${sessionId}/analysis`);
}

export async function deleteScreenshotsAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const importId = String(formData.get("importId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const { data: images } = await supabase.from("run_import_images").select("id, storage_path").eq("run_import_id", importId).eq("user_id", user.id).is("deleted_at", null);
  if (images?.length) {
    await supabase.storage.from(BUCKET).remove(images.map((image) => image.storage_path));
    await supabase.from("run_import_images").update({ deleted_at: new Date().toISOString() }).in("id", images.map((image) => image.id)).eq("user_id", user.id);
  }
  revalidatePath(`/history/${sessionId}/analysis`);
}
