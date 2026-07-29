"use client";

import { useState } from "react";
import type { GuidedExerciseItem } from "@/lib/services/strengthGuidanceService";
import { LoadGuidance } from "@/components/load-guidance";

export function GuidedMode({ items }: { items: GuidedExerciseItem[] }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  if (!active) {
    return (
      <button type="button" onClick={() => setActive(true)} className="btn-secondary w-full">
        Start guided mode
      </button>
    );
  }

  const item = items[index];
  if (!item) return null;
  const cues = (item.exercise.cues as string[]) ?? [];
  const mistakes = (item.exercise.mistakes as string[]) ?? [];

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">
          Exercise {index + 1} of {items.length}
        </p>
        <button type="button" onClick={() => setActive(false)} className="text-xs text-slate-400 underline">
          Exit
        </button>
      </div>
      <h3 className="text-lg font-bold text-slate-900">{item.exercise.name}</h3>
      <p className="text-sm text-slate-600">
        {item.setCount} x {item.repRangeLow}-{item.repRangeHigh}
        {item.loadMetadata.repScope === "per_side" ? " per side" : ""}, rest {item.restSeconds}s
      </p>

      <LoadGuidance recommendation={item.recommendation} metadata={item.loadMetadata} />

      <div>
        <p className="text-xs font-semibold text-slate-500">Setup</p>
        <p className="text-sm text-slate-700">{item.exercise.setup}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">Execution</p>
        <p className="text-sm text-slate-700">{item.exercise.execution}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">Cues</p>
        <ul className="list-inside list-disc text-sm text-slate-700">
          {cues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">Common mistakes</p>
        <ul className="list-inside list-disc text-sm text-slate-700">
          {mistakes.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-800">Stop / substitute</p>
        <p className="text-sm text-amber-900">{item.exercise.stop_substitute_guidance}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="btn-secondary flex-1"
        >
          Back
        </button>
        <button
          type="button"
          disabled={index === items.length - 1}
          onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
          className="btn-primary flex-1"
        >
          Next
        </button>
      </div>
    </div>
  );
}
