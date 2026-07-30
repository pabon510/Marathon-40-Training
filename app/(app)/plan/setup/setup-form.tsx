"use client";

import { useActionState, useMemo, useState } from "react";
import { submitWeeklySetupAction, type WeeklySetupFormState } from "./actions";
import { RECOVERY_ROUTINES } from "@/domain/content/recoveryRoutines";

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function weekdayOf(date: string) {
  return WEEKDAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
}

const initialState: WeeklySetupFormState = {};

export function WeeklySetupForm({
  weekStartDate,
  weekDates,
  defaultAvailableWeekdays,
  preferredLongRunDay,
  existing,
}: {
  weekStartDate: string;
  weekDates: string[];
  defaultAvailableWeekdays: string[];
  preferredLongRunDay: "saturday" | "sunday";
  existing: {
    availableDates: string[];
    intendedLongRunDate: string;
    backupLongRunDate: string;
    activeRecoveryChoices: { localDate: string; routineSlug: string }[];
  } | null;
}) {
  const [state, formAction, pending] = useActionState(submitWeeklySetupAction, initialState);

  const [available, setAvailable] = useState<Set<string>>(
    new Set(existing?.availableDates ?? weekDates.filter((d) => defaultAvailableWeekdays.includes(weekdayOf(d)))),
  );

  const weekendDates = useMemo(() => weekDates.filter((d) => ["saturday", "sunday"].includes(weekdayOf(d))), [weekDates]);
  const defaultLongRun =
    existing?.intendedLongRunDate ?? weekendDates.find((d) => weekdayOf(d) === preferredLongRunDay) ?? weekendDates[0];
  const [longRunDate, setLongRunDate] = useState(defaultLongRun ?? "");
  const [recoveryChoices, setRecoveryChoices] = useState<Record<string, string>>(
    Object.fromEntries((existing?.activeRecoveryChoices ?? []).map((choice) => [choice.localDate, choice.routineSlug])),
  );

  function toggleDate(date: string) {
    setAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else {
        next.add(date);
        setRecoveryChoices((choices) => {
          const updated = { ...choices };
          delete updated[date];
          return updated;
        });
      }
      return next;
    });
  }

  const backupDate = weekendDates.find((d) => d !== longRunDate) ?? longRunDate;

  return (
    <form action={formAction} className="card space-y-4">
      <input type="hidden" name="weekStartDate" value={weekStartDate} />
      <input type="hidden" name="backupLongRunDate" value={backupDate} />
      <input
        type="hidden"
        name="activeRecoveryChoices"
        value={JSON.stringify(Object.entries(recoveryChoices).map(([localDate, routineSlug]) => ({ localDate, routineSlug })))}
      />

      <fieldset>
        <legend className="field-label">Available days ({available.size} selected)</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {weekDates.map((date) => (
            <label
              key={date}
              className="flex min-h-touch items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="availableDates"
                value={date}
                checked={available.has(date)}
                onChange={() => toggleDate(date)}
                className="h-5 w-5 rounded border-slate-300 text-brand-600"
              />
              <span className="capitalize">
                {weekdayOf(date)} <span className="text-slate-400">({date})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
        <legend className="px-1 text-sm font-semibold text-slate-900">Optional active recovery</legend>
        <p className="mb-3 text-xs text-slate-600">
          Add up to two gentle at-home mobility sessions on rest days. Keep effort at 1–3/10.
        </p>
        <div className="space-y-2">
          {weekDates.filter((date) => !available.has(date)).map((date) => {
            const selected = recoveryChoices[date];
            return (
              <div key={date} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <label className="flex min-h-touch items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(selected)}
                    disabled={!selected && Object.keys(recoveryChoices).length >= 2}
                    onChange={(event) =>
                      setRecoveryChoices((choices) => {
                        const updated = { ...choices };
                        if (event.target.checked) updated[date] = RECOVERY_ROUTINES[0]!.slug;
                        else delete updated[date];
                        return updated;
                      })
                    }
                  />
                  <span className="capitalize">{weekdayOf(date)} active recovery</span>
                </label>
                {selected ? (
                  <select
                    aria-label={`${weekdayOf(date)} recovery routine`}
                    className="text-input mt-2"
                    value={selected}
                    onChange={(event) => setRecoveryChoices((choices) => ({ ...choices, [date]: event.target.value }))}
                  >
                    {RECOVERY_ROUTINES.map((routine) => (
                      <option key={routine.slug} value={routine.slug}>
                        {routine.name} · {routine.durationMinutes} min
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Long-run day (Saturday or Sunday)</legend>
        <div className="mt-2 flex gap-4">
          {weekendDates.map((date) => (
            <label key={date} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="radio"
                name="intendedLongRunDate"
                value={date}
                checked={longRunDate === date}
                onChange={() => setLongRunDate(date)}
                disabled={!available.has(date)}
              />
              {weekdayOf(date)}
            </label>
          ))}
        </div>
        <p className="field-hint">The other weekend day becomes the automatic backup.</p>
      </fieldset>

      {state.error ? <p className="text-sm font-medium text-safety-block">{state.error}</p> : null}

      <button type="submit" disabled={pending || available.size < 3} className="btn-primary w-full">
        {pending ? "Generating plan…" : "Generate this week's plan"}
      </button>
    </form>
  );
}
