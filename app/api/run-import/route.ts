import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import {
  GARMIN_EXTRACTION_PROMPT,
  GARMIN_IMPORT_MODEL,
  GARMIN_PARSER_VERSION,
  garminExtractionSchema,
} from "@/domain/import/garminScreenshot";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { todayLocalDate } from "@/lib/date";
import type { RunPrescription } from "@/domain/types";

export const runtime = "nodejs";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 900_000;
const MAX_TOTAL_BYTES = 3_000_000;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const SCREENSHOT_BUCKET = "garmin-run-screenshots";
const RETENTION_DAYS = 180;

function decodedBytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Screenshot import is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }
  const images = (body as { images?: unknown })?.images;
  if (!Array.isArray(images) || images.length < 1 || images.length > MAX_IMAGES) {
    return NextResponse.json({ error: "Upload between 1 and 5 screenshots." }, { status: 400 });
  }

  let totalBytes = 0;
  const validated: { dataUrl: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; base64: string; bytes: number }[] = [];
  for (const image of images) {
    if (typeof image !== "string") {
      return NextResponse.json({ error: "Every upload must be an image." }, { status: 400 });
    }
    const match = DATA_URL.exec(image);
    if (!match) {
      return NextResponse.json({ error: "Use JPEG, PNG, or WebP screenshots." }, { status: 400 });
    }
    const size = decodedBytes(match[2]!);
    if (size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "One screenshot is still too large after resizing." }, { status: 413 });
    }
    totalBytes += size;
    validated.push({ dataUrl: image, mimeType: match[1] as "image/jpeg" | "image/png" | "image/webp", base64: match[2]!, bytes: size });
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "The screenshots are too large to process together." }, { status: 413 });
  }

  try {
    // Opportunistic retention cleanup. A future scheduled job can call the
    // same policy more frequently; logging never depends on cleanup success.
    const { data: expired } = await supabase
      .from("run_import_images")
      .select("id, storage_path")
      .eq("user_id", user.id)
      .eq("keep_permanently", false)
      .is("deleted_at", null)
      .lt("expires_at", new Date().toISOString())
      .limit(50);
    if (expired?.length) {
      await supabase.storage.from(SCREENSHOT_BUCKET).remove(expired.map((image) => image.storage_path));
      await supabase.from("run_import_images").update({ deleted_at: new Date().toISOString() }).in("id", expired.map((image) => image.id));
    }

    const importId = crypto.randomUUID();
    const { error: draftError } = await supabase.from("run_imports").insert({
      id: importId,
      user_id: user.id,
      provider: "garmin_screenshot",
      status: "draft",
      model: GARMIN_IMPORT_MODEL,
      parser_version: GARMIN_PARSER_VERSION,
      image_count: validated.length,
      extracted_payload: {},
    });
    if (draftError) throw draftError;

    const uploadedPaths: string[] = [];
    try {
      const expiresAt = new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString();
      for (const [index, image] of validated.entries()) {
        const extension = image.mimeType === "image/png" ? "png" : image.mimeType === "image/webp" ? "webp" : "jpg";
        const path = `${user.id}/${importId}/${index + 1}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(SCREENSHOT_BUCKET)
          .upload(path, Buffer.from(image.base64, "base64"), { contentType: image.mimeType, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        const { error: imageRowError } = await supabase.from("run_import_images").insert({
          user_id: user.id,
          run_import_id: importId,
          ordinal: index + 1,
          storage_path: path,
          mime_type: image.mimeType,
          byte_size: image.bytes,
          expires_at: expiresAt,
        });
        if (imageRowError) throw imageRowError;
      }

      const profile = await getProfile(supabase, user.id);
      const workout = profile
        ? await getPlannedWorkoutForDate(supabase, user.id, todayLocalDate(profile.timezone))
        : null;
      const prescription = workout?.run_prescription as unknown as RunPrescription | null;
      const prescriptionContext = prescription?.hrCeiling
        ? `\nPrescribed easy-run HR ceiling for chart comparison: ${prescription.hrCeiling} bpm.`
        : "\nNo prescribed HR ceiling is available; return not_assessable for ceiling comparison.";
      const intervalContext = prescription?.intervals?.length
        ? `\nPlanned structured workout: ${prescription.intervals.map((interval) => `${interval.repeats} repetitions of ${interval.workMinutes} minutes work and ${interval.restMinutes} minutes recovery`).join("; ")}. Use this only to label and validate clearly printed interval rows; never invent a missing row.`
        : "\nNo structured interval prescription is available. Still extract a clearly printed Garmin Intervals table if supplied.";

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.responses.parse({
        model: GARMIN_IMPORT_MODEL,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: GARMIN_EXTRACTION_PROMPT + prescriptionContext + intervalContext },
            ...validated.map((image) => ({
              type: "input_image" as const,
              image_url: image.dataUrl,
              detail: "high" as const,
            })),
          ],
        }],
        text: { format: zodTextFormat(garminExtractionSchema, "garmin_run_summary") },
      });
      const extraction = response.output_parsed;
      if (!extraction) throw new Error("Garmin data could not be read from these screenshots.");

      const { data: importRow, error } = await supabase
        .from("run_imports")
        .update({ extracted_payload: extraction })
        .eq("id", importId)
        .eq("user_id", user.id)
        .select("id")
        .single();
      if (error || !importRow) throw error ?? new Error("Could not save extraction draft.");

      return NextResponse.json({ importId: importRow.id, extraction });
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from(SCREENSHOT_BUCKET).remove(uploadedPaths);
      await supabase.from("run_imports").delete().eq("id", importId).eq("user_id", user.id);
      throw error;
    }
  } catch (error) {
    console.error("Garmin screenshot extraction failed", error);
    return NextResponse.json(
      { error: "Screenshot extraction failed. You can retry or enter the run manually." },
      { status: 502 },
    );
  }
}
