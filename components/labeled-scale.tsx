"use client";

import { useId, useState } from "react";

interface LabeledScaleProps {
  label: string;
  name?: string;
  min: number;
  max: number;
  labels: Readonly<Record<number, string>>;
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number) => void;
  required?: boolean;
}

export function LabeledScale({
  label,
  name,
  min,
  max,
  labels,
  value,
  defaultValue = null,
  onChange,
  required = false,
}: LabeledScaleProps) {
  const generatedName = useId();
  const inputName = name ?? `scale-${generatedName}`;
  const [internalValue, setInternalValue] = useState<number | null>(defaultValue);
  const selected = value === undefined ? internalValue : value;
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  function select(next: number) {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  }

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-baseline justify-between gap-2">
        <span className="field-label">{label}</span>
        <span className={selected === null ? "text-xs text-slate-400" : "text-xs font-semibold text-brand-700"}>
          {selected === null ? "Not answered" : `${selected}/${max} — ${labels[selected]}`}
        </span>
      </div>
      <div className={`mt-2 grid gap-1.5 ${values.length > 10 ? "grid-cols-6" : "grid-cols-5"}`}>
        {values.map((option) => {
          const checked = selected === option;
          return (
            <label
              key={option}
              className={`flex min-h-touch cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold ${
                checked
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name={inputName}
                value={option}
                checked={checked}
                required={required}
                onChange={() => select(option)}
                aria-label={`${label}: ${option}, ${labels[option]}`}
              />
              {option}
            </label>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between gap-3 text-[11px] text-slate-500">
        <span>{min}: {labels[min]}</span>
        <span className="text-right">{max}: {labels[max]}</span>
      </div>
    </fieldset>
  );
}
