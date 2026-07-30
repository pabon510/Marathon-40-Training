"use client";

import { useRef, useState } from "react";
import type { GarminExtraction } from "@/domain/import/garminScreenshot";

const MAX_IMAGES = 5;
const MAX_DIMENSION = 1800;

async function resizeScreenshot(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the screenshot.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function GarminScreenshotImport({
  onImported,
}: {
  onImported: (importId: string, extraction: GarminExtraction) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function extract() {
    if (files.length < 1) return;
    setBusy(true);
    setError(undefined);
    try {
      const images = await Promise.all(files.map(resizeScreenshot));
      const response = await fetch("/api/run-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const result = (await response.json()) as {
        importId?: string;
        extraction?: GarminExtraction;
        error?: string;
      };
      if (!response.ok || !result.importId || !result.extraction) {
        throw new Error(result.error ?? "The screenshots could not be read.");
      }
      onImported(result.importId, result.extraction);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Screenshot extraction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50 p-4">
      <h2 className="font-semibold text-slate-900">Import Garmin screenshots</h2>
      <p className="mt-1 text-sm text-slate-600">
        Choose up to five Garmin summary screenshots. They are processed temporarily and are not saved.
      </p>
      <input
        ref={inputRef}
        className="mt-3 block w-full text-sm"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          if (selected.length > MAX_IMAGES) {
            setError("Choose no more than five screenshots.");
            setFiles([]);
            return;
          }
          setError(undefined);
          setFiles(selected);
        }}
      />
      {files.length > 0 ? (
        <p className="mt-2 text-xs text-slate-600">
          {files.length} screenshot{files.length === 1 ? "" : "s"} selected
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm font-medium text-safety-block">{error}</p> : null}
      <button
        type="button"
        className="btn-secondary mt-3 w-full"
        disabled={busy || files.length === 0}
        onClick={extract}
      >
        {busy ? "Reading Garmin data…" : "Extract Garmin data"}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Nothing is logged until you review the values and save the run.
      </p>
    </section>
  );
}
