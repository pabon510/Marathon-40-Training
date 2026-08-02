"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  READINESS_METRICS,
  readinessDefinition,
  type ReadinessMetricName,
} from "@/domain/content/readinessScales";
import { submitCheckInAction, type CheckInFormState } from "./actions";

const initialState: CheckInFormState = {};

const AVAILABLE_TIME_OPTIONS = [
  { value: "15", label: "15" },
  { value: "30", label: "30" },
  { value: "45", label: "45" },
  { value: "60", label: "60" },
  { value: "75", label: "75" },
  { value: "90_plus", label: "90+" },
] as const;

const KNEE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const FRIENDLY_FIELD_NAMES: Record<string, string> = {
  energy: "Energy",
  soreness: "Soreness",
  stress: "Stress",
  fatigue: "Fatigue",
  knee: "Knee discomfort",
  hoursSlept: "Hours slept",
  ouraScore: "Oura Sleep Score",
  availableTime: "Available time",
};

/** Shared look for every discrete choice button (readiness, knee, time, location). */
function choiceClass(selected: boolean): string {
  const base =
    "flex min-h-touch cursor-pointer items-center justify-center rounded-lg px-1 text-sm transition-colors " +
    "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 " +
    "has-[:focus-visible]:outline-brand-600";
  // Selection is signalled by weight and ring thickness as well as colour, so
  // it never depends on colour perception alone.
  return selected
    ? `${base} bg-brand-600 font-bold text-white ring-2 ring-inset ring-brand-800`
    : `${base} bg-white font-normal text-slate-700 ring-1 ring-inset ring-slate-300`;
}

type ReadinessScores = Record<ReadinessMetricName, number | null>;

const EMPTY_SCORES: ReadinessScores = { energy: null, soreness: null, stress: null, fatigue: null };

export interface CheckInFormViewProps {
  needsLocation: boolean;
  needsAvailableTime?: boolean;
  /** Today's already-chosen strength location, so the answer is remembered. */
  rememberedLocation?: "gym" | "home" | null;
  state: CheckInFormState;
  action: (formData: FormData) => void;
  pending: boolean;
}

/**
 * The morning check-in.
 *
 * Two rules drive the whole design:
 *  - Nothing is pre-answered. Every readiness field, the knee score, and the
 *    available-time choice all start with no selection, so a score can only
 *    ever be stored because the user tapped it.
 *  - Unanswered is allowed, but never silent. Submitting with blanks raises a
 *    single confirmation listing exactly what was left out, and an unanswered
 *    knee score is called out separately because it changes what is safe.
 *
 * Exported separately from `CheckInForm` so tests can drive it with a stub
 * action instead of a real server action.
 */
export function CheckInFormView({
  needsLocation,
  needsAvailableTime = true,
  rememberedLocation = null,
  state,
  action,
  pending,
}: CheckInFormViewProps) {
  const [scores, setScores] = useState<ReadinessScores>(EMPTY_SCORES);
  const [knee, setKnee] = useState<number | null>(null);
  const [kneeDeclined, setKneeDeclined] = useState(false);
  const [availableTime, setAvailableTime] = useState<string | null>(null);
  const [location, setLocation] = useState<"gym" | "home" | null>(rememberedLocation);
  const [hoursSlept, setHoursSlept] = useState("");
  const [ouraScore, setOuraScore] = useState("");
  const [confirming, setConfirming] = useState<string[] | null>(null);

  const confirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (state.outcome) {
    return <CheckInResult outcome={state.outcome} />;
  }

  if (state.savedWithoutWorkout) {
    return (
      <div className="card space-y-2">
        <p className="text-sm font-semibold text-safety-ok">Check-in saved.</p>
        <p className="text-sm text-slate-600">
          There is no workout scheduled today, so nothing needed to be adapted.
        </p>
        <p className="text-xs text-slate-500">Your recovery and knee trends now include today.</p>
      </div>
    );
  }

  /** Field keys the user left blank, in the order they appear on screen. */
  function findMissing(): string[] {
    const missing: string[] = [];
    if (hoursSlept.trim() === "") missing.push("hoursSlept");
    if (ouraScore.trim() === "") missing.push("ouraScore");
    for (const metric of READINESS_METRICS) {
      if (scores[metric.name] === null) missing.push(metric.name);
    }
    // An explicit "I don't know" is an answer about the answer — don't nag,
    // but the conservative-fallback notice stays visible either way.
    if (knee === null && !kneeDeclined) missing.push("knee");
    if (needsAvailableTime && availableTime === null) missing.push("availableTime");
    return missing;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) return;
    const missing = findMissing();
    if (missing.length > 0) {
      event.preventDefault();
      setConfirming(missing);
    }
  }

  function confirmAndSubmit() {
    confirmedRef.current = true;
    setConfirming(null);
    formRef.current?.requestSubmit();
  }

  const kneeUnanswered = knee === null;

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="card space-y-3">
      <input type="hidden" name="needsLocation" value={String(needsLocation)} />

      <h2 className="text-base font-bold text-slate-900">Morning check-in</h2>

      {/* Sleep: compact, two-up on anything wider than a small phone. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hoursSlept" className="field-label">
            Hours slept
          </label>
          <input
            id="hoursSlept"
            name="hoursSlept"
            type="number"
            inputMode="decimal"
            step="0.25"
            min={0}
            max={24}
            placeholder="6.5"
            value={hoursSlept}
            onChange={(e) => setHoursSlept(e.target.value)}
            className="text-input"
          />
        </div>
        <div>
          <label htmlFor="ouraScore" className="field-label">
            Oura score
          </label>
          <input
            id="ouraScore"
            name="ouraScore"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            placeholder="0-100"
            value={ouraScore}
            onChange={(e) => setOuraScore(e.target.value)}
            className="text-input"
          />
        </div>
      </div>

      {READINESS_METRICS.map((metric) => {
        const value = scores[metric.name];
        const definition = readinessDefinition(metric.name, value);
        return (
          <fieldset key={metric.name} className="min-w-0 border-0 p-0">
            {/* The visible label sits in a flex row with the current selection
                so the readout costs no extra vertical space; the sr-only
                legend is what names the group for assistive tech. */}
            <legend className="sr-only">{metric.label}</legend>
            <div className="flex items-baseline justify-between gap-2">
              <span className="field-label">{metric.label}</span>
              <span className="flex items-baseline gap-2">
                <span className={value === null ? "text-xs text-slate-400" : "text-xs font-medium text-slate-700"}>
                  {value === null ? "Not answered" : `Selected: ${value}, ${definition}`}
                </span>
                {value !== null ? (
                  <button
                    type="button"
                    onClick={() => setScores((prev) => ({ ...prev, [metric.name]: null }))}
                    className="shrink-0 text-xs text-slate-500 underline"
                  >
                    Clear
                  </button>
                ) : null}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={choiceClass(value === n)}>
                  <input
                    type="radio"
                    name={metric.name}
                    value={n}
                    checked={value === n}
                    onChange={() => setScores((prev) => ({ ...prev, [metric.name]: n }))}
                    className="sr-only"
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="sr-only">Knee discomfort</legend>
        <div className="flex items-baseline justify-between gap-2">
          <span className="field-label">Knee discomfort (0-10)</span>
          <button
            type="button"
            aria-pressed={kneeDeclined}
            onClick={() => {
              setKnee(null);
              setKneeDeclined(true);
            }}
            className={`shrink-0 text-xs underline ${kneeDeclined ? "font-semibold text-amber-800" : "text-slate-500"}`}
          >
            I don&apos;t know
          </button>
        </div>
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">
          {KNEE_VALUES.map((n) => (
            <label key={n} className={choiceClass(knee === n)}>
              <input
                type="radio"
                name="knee"
                value={n}
                checked={knee === n}
                onChange={() => {
                  setKnee(n);
                  setKneeDeclined(false);
                }}
                className="sr-only"
              />
              {n}
            </label>
          ))}
        </div>
        <p
          className={
            kneeUnanswered ? "mt-1.5 text-sm font-semibold text-slate-400" : "mt-1.5 text-sm font-semibold text-brand-700"
          }
        >
          {kneeUnanswered ? "Knee discomfort: not answered" : `Knee discomfort: ${knee}/10`}
        </p>
        {kneeUnanswered ? (
          <p className="mt-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            {needsAvailableTime
              ? "Today's plan will default to non-running until knee discomfort is confirmed."
              : "A knee score helps detect discomfort that appears the day after training."}
          </p>
        ) : null}
      </fieldset>

      {needsAvailableTime ? <fieldset className="min-w-0 border-0 p-0">
        <legend className="field-label">Available time (minutes)</legend>
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">
          {AVAILABLE_TIME_OPTIONS.map((option) => (
            <label key={option.value} className={choiceClass(availableTime === option.value)}>
              <input
                type="radio"
                name="availableTime"
                value={option.value}
                checked={availableTime === option.value}
                onChange={() => setAvailableTime(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset> : null}

      {needsLocation ? (
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="field-label">Strength location today</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["gym", "home"] as const).map((loc) => (
              <label key={loc} className={`${choiceClass(location === loc)} capitalize`}>
                <input
                  type="radio"
                  name="strengthLocation"
                  value={loc}
                  checked={location === loc}
                  onChange={() => setLocation(loc)}
                  className="sr-only"
                />
                {loc}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-safety-block">
          {state.error}
        </p>
      ) : null}

      {confirming ? (
        <MissingFieldsConfirmation
          missing={confirming}
          appliesWorkoutRules={needsAvailableTime}
          onGoBack={() => setConfirming(null)}
          onSubmitAnyway={confirmAndSubmit}
        />
      ) : null}

      {/* Sticky above the fixed bottom nav; --bottom-nav-h carries the
          iPhone home-indicator inset so the two can never overlap. */}
      <div
        data-testid="sticky-submit"
        className="sticky z-10 -mx-4 -mb-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"
        style={{ bottom: "var(--bottom-nav-h, 0px)" }}
      >
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Submitting…" : "Submit check-in"}
        </button>
      </div>
    </form>
  );
}

function MissingFieldsConfirmation({
  missing,
  appliesWorkoutRules,
  onGoBack,
  onSubmitAnyway,
}: {
  missing: string[];
  appliesWorkoutRules: boolean;
  onGoBack: () => void;
  onSubmitAnyway: () => void;
}) {
  const names = missing.map((field) => FRIENDLY_FIELD_NAMES[field] ?? field);
  // "A" / "A and B" / "A, B, and C"
  const listed =
    names.length === 1
      ? names[0]!
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  const kneeMissing = missing.includes("knee");

  // A true overlay, not an inline block: the submit button is sticky at the
  // bottom of the viewport, so an in-flow confirmation could appear well
  // below the fold and be missed entirely.
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={onGoBack}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="missing-fields-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border-2 border-safety-warn bg-amber-50 p-4 shadow-lg"
        style={{ marginBottom: "var(--bottom-nav-h, 0px)" }}
      >
        <p id="missing-fields-title" className="text-sm font-semibold text-amber-900">
          You have not answered {listed}. Submit anyway?
        </p>
        {kneeMissing && appliesWorkoutRules ? (
          <p className="mt-2 text-sm text-amber-900">
            Without a knee score, today&apos;s plan will use the conservative non-running fallback:
            upper-body, core, mobility, walking, or rest.
          </p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button type="button" autoFocus onClick={onGoBack} className="btn-secondary flex-1">
            Go back
          </button>
          <button type="button" onClick={onSubmitAnyway} className="btn-primary flex-1">
            Submit with missing fields
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckInResult({ outcome }: { outcome: NonNullable<CheckInFormState["outcome"]> }) {
  return (
    <div className="card space-y-3">
      <span className={outcome.blocked ? "badge-block" : outcome.changed ? "badge-warn" : "badge-ok"}>
        {outcome.blocked ? "Blocked" : outcome.changed ? "Adjusted" : "Confirmed"}
      </span>
      <p className="text-base font-semibold text-slate-900">{outcome.headline}</p>
      <p className="text-sm text-slate-600">{outcome.detail}</p>
      {outcome.reason ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{outcome.reason}</p>
      ) : null}
      <Link href="/workouts" className="btn-primary inline-flex">
        Open today&apos;s workout
      </Link>
    </div>
  );
}

export function CheckInForm({
  needsLocation,
  needsAvailableTime = true,
  rememberedLocation = null,
}: {
  needsLocation: boolean;
  needsAvailableTime?: boolean;
  rememberedLocation?: "gym" | "home" | null;
}) {
  const [state, formAction, pending] = useActionState(submitCheckInAction, initialState);
  return (
    <CheckInFormView
      needsLocation={needsLocation}
      needsAvailableTime={needsAvailableTime}
      rememberedLocation={rememberedLocation}
      state={state}
      action={formAction}
      pending={pending}
    />
  );
}
