# Version 1 Scope

## Core launch requirements

### Access and profile

- Private sign-in with the sole manually created Supabase username/password account.
- No public registration.
- Seed the initial profile from `config/profile.json` (or YAML) on first setup; keep a human-readable `docs/TRAINING_PROFILE.md` if implementation adds it.
- In-app settings: target marathon date, default available days, preferred long-run day, home/gym equipment, provisional easy-run HR ceiling, and reminder preferences.
- Injury history and original baseline remain repository-managed.
- Seed changes never overwrite live data automatically.

### Weekly planning

- Rolling seven-day plan starting today.
- Separate Monday–Sunday aggregation for consistency.
- Weekly availability setup, defaulting to Tuesday, Thursday, Friday, and a weekend day; optional fifth day.
- Select Saturday or Sunday as intended long-run day; the other is backup.
- Plan starts on the next available workout day.
- Preview permits editing availability and long-run day, not detailed prescriptions.
- Four-day default: two strength and two runs.
- Five-day default: two strength and three runs.
- Three-day compression: long run, full-body strength, and combined short run + strength.
- Do not schedule materially overlapping strength sessions on consecutive days; a shorter upper/core session may follow a lower-body session.
- Threshold work replaces a short easy run.
- A missed long run becomes a shorter run rather than moving long-run debt forward.

### Daily recommendation and check-in

- Before check-in, show the planned workout as provisional.
- Require morning check-in before starting a workout.
- Fields: hours slept (skippable with confirmation), optional manual Oura Sleep Score, energy/soreness/stress/fatigue on defined 1–5 scales, knee discomfort 0–10, available time (15/30/45/60/75/90+), and strength location only when relevant.
- A skipped field requires explicit confirmation; absence is not treated as a healthy value.
- Check-in can be refreshed voluntarily later.
- After evaluation, show primary recommendation, shorter alternative, brief goal, and plain-language reason.
- User may override non-blocked recommendations after selecting a reason. Overrides are recorded.

### Running prescriptions

- Prescribe primarily by minutes.
- Easy and long runs: duration, provisional HR target/ceiling, optional pace reference, and built-in walk-break option.
- Initial easy guidance: approximately 140–150 bpm with 150 as provisional ceiling. If above 150 for about two minutes, advise slowing or walking.
- First two weeks are calibration: maintain/reduce only; no progression.
- One threshold session every other week during month one; use time or distance segments, with time preferred.
- Pace guides threshold/short intervals; HR is secondary because it lags.
- Garmin zones and 150 bpm ceiling remain explicitly provisional and editable.
- Treadmill warmup mileage counts toward weekly mileage but not as a completed run workout.

### Strength prescriptions

- Normal session: warmup, 5–6 exercises, core, optional finisher; target 45–60 minutes.
- Rotating full-body emphasis based on available days, while consistently supporting lower body, hip abductors, core, and upper body.
- Main movements remain stable for four weeks; accessories rotate sparingly.
- Every prescribed exercise includes setup, execution, 2–3 cues, common mistakes, target muscles, and stop/substitute guidance.
- Full workout overview first; guided exercise mode second.
- Log summarized completed values per exercise (for example 3 × 10 × 25 lb), plus one difficulty score per exercise.

### Gym/home/short conversion

- Each strength workout supports Planet Fitness and home variants.
- Choose location during check-in or workout; remember it for that day.
- Shorter alternative applies to either location.
- Home equipment: 15/25 lb dumbbells, bands, bench, and adjustable kettlebell at 15/25/35/45 lb.
- Never prescribe adjustable-kettlebell swings. Dumbbell swings may exist but are not core.
- Progress limited home loads using reps, tempo, pauses, range, or unilateral variants.
- Converted and recommended shortened workouts earn full completion credit.

### Logging

- Run fields: distance, duration, calculated pace with override, average HR, maximum HR, effort 1–10, knee discomfort, optional elevation gain, type (outdoor/treadmill/run-walk), and optional mile split paces.
- Strength fields: summarized sets/reps/load and exercise difficulty; completion state and substitutions.
- Integrated post-workout check-in: overall effort 1–10; highest knee discomfort during; discomfort immediately after; full/partial/stopped; easier/as expected/harder; unusual pain; notes.
- Shortened, substituted, stopped, skipped, or overridden work requires a reason.
- Allow unplanned runs, walks, cycling, mobility, and strength.
- Allow editing completed logs; recalculate only when a material input changes.
- Immediately show preliminary impact on tomorrow, then confirm after next-morning knee score.

### Dashboard

- Weekly run minutes and miles.
- “Running is getting easier” trend based only on comparable runs.
- Compare easy runs within roughly 10 minutes; separate outdoor/treadmill; compare pace at similar average HR; evaluate threshold separately.
- Strength completion/consistency.
- Daily knee chart, plus weekly maximum and direction.
- Rolling plan with small change history attached to affected days.
- Visible four-week scorecard from day one.

## Immediate post-launch

- Resend email reminders; web push only if reliable and low effort.
- 5:00 a.m. morning check-in reminder on planned workout days.
- Sunday 8:00 p.m. weekly planning reminder.
- One unlogged-workout reminder: weekdays by 10:00 a.m.; weekends by 8:00 p.m.
- Reminder opens Start workout / Log completed workout / Skip today.
- Unlogged work becomes incomplete the following day.
- Weekly consistency score using adapted plan.
- Streak preserved by completing at least 75% of adapted weekly plan.
- Personal records: pace, distance, weight, and reps.
- No marathon readiness score or badges in Version 1.

## Acceptance boundary

Core launch is complete only when the primary journeys work on iPhone-sized and desktop layouts, data persists across sessions/devices, safety blocks cannot be bypassed, the plan recalculates deterministically, and change reasons are visible. Reminder and gamification work must not be used to declare the core incomplete.
