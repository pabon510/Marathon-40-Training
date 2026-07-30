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

export const runtime = "nodejs";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 900_000;
const MAX_TOTAL_BYTES = 3_000_000;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

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
  const validated: string[] = [];
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
    validated.push(image);
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "The screenshots are too large to process together." }, { status: 413 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.parse({
      model: GARMIN_IMPORT_MODEL,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: GARMIN_EXTRACTION_PROMPT },
          ...validated.map((image) => ({
            type: "input_image" as const,
            image_url: image,
            detail: "high" as const,
          })),
        ],
      }],
      text: { format: zodTextFormat(garminExtractionSchema, "garmin_run_summary") },
    });
    const extraction = response.output_parsed;
    if (!extraction) {
      return NextResponse.json({ error: "Garmin data could not be read from these screenshots." }, { status: 422 });
    }

    const { data: importRow, error } = await supabase
      .from("run_imports")
      .insert({
        user_id: user.id,
        provider: "garmin_screenshot",
        status: "draft",
        model: GARMIN_IMPORT_MODEL,
        parser_version: GARMIN_PARSER_VERSION,
        image_count: validated.length,
        extracted_payload: extraction,
      })
      .select("id")
      .single();
    if (error || !importRow) throw error ?? new Error("Could not save extraction draft.");

    return NextResponse.json({ importId: importRow.id, extraction });
  } catch (error) {
    console.error("Garmin screenshot extraction failed", error);
    return NextResponse.json(
      { error: "Screenshot extraction failed. You can retry or enter the run manually." },
      { status: 502 },
    );
  }
}
