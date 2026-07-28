# Adaptation Rules

Rules are deterministic and versioned. Apply in this order: **safety block → knee adaptation → general recovery → time/location conversion → weekly rebalance → progression eligibility**. A lower-priority rule may not weaken a higher-priority restriction.

## Inputs

- Latest morning knee score and preceding daily scores.
- Knee score at workout start and highest during workout.
- Morning energy, soreness, fatigue, sleep hours, Oura score, and recent Oura average.
- Available time and location.
- Completed/missed/unplanned training and lower-body/running load.
- Post-workout effort and next-morning response.

Stress is displayed and stored, but ordinary stress alone never reduces training.

## Knee rules

- **0–2, stable or improving:** keep planned workout.
- **0–2, worsening:** do not progress; retain or modestly shorten based on other recovery inputs.
- **3–5, improving:** easy running allowed; no duration/intensity increase. Strength allowed if selected exercises do not increase discomfort.
- **3–5, stable:** replace threshold/interval work with easy running. Lower-body strength allowed only with pain-neutral movements and no increase during execution.
- **3–5, worsening:** replace running and lower-body strength with upper-body/core, mobility, walking, or rest.
- **6–10:** hard block running and lower-body strength; offer upper-body/core, mobility, walking, or rest.
- “Worsening” means higher than the prior recorded daily knee score. If no prior score exists, trend is unknown and progression is prohibited.

Pain duration, location, walking impact, swelling, locking, or instability may be recorded/displayed but do not silently change the agreed numeric algorithm. Red-flag symptoms trigger safety messaging.

## During-workout rule

Stop and hard-block the current running/lower-body work if knee discomfort reaches 6 or rises by 2+ points from its starting value. Do not allow override. Offer safe alternatives and recalculate the week.

## General recovery

Poor recovery exists when at least two are true:

- Energy is 1–2.
- Soreness is 4–5.
- Sleep is unusually poor relative to Andrew's norm.
- Oura score is below 75 or at least 12 points below the recent normal average.

Reduce/downgrade only when poor recovery exists **and fatigue is 4–5**. One poor night, one high-stress day, or stress alone does not change training.

Suggested response:

- Moderate poor recovery: shorten up to the available time or change quality work to easy.
- Severe/multiple-day poor recovery: easy work, upper/core, mobility, or rest.
- Any reduction is permitted without asking, including full replacement, if explained.

## Time and location

- Available-time selection produces the closest safe full or short version; it never compresses prescribed rest so severely that workout intent changes.
- Gym/home conversion uses explicit equivalence mappings.
- Location choice is remembered for that local date.
- Full credit applies when the recommended adaptation is completed.

## Missed and unplanned work

- Never accumulate workout debt.
- Recalculate remaining week and drop lower-priority work as needed.
- Priority in month one: long easy run; lower/core strength; full/upper strength; short easy run; threshold (threshold is below consistency/strength and replaces an easy run).
- If only three days remain: long run, full-body strength, combined short run + strength.
- Missed weekend long run becomes a shorter run; do not force it onto a weekday or next week.
- Meaningful unplanned running or lower-body load triggers recalculation. Easy walking/brief mobility does not.

## Progression

### Running

- Weeks 1–2: calibration; no upward progression.
- Review only at weekly boundary.
- A run qualifies only if: completed as planned; effort ≤7; next-morning knee did not increase; recovery acceptable.
- Increase only one variable: duration/distance **or** intensity, never both.
- Weekly running-load increase is capped around 5% as a ceiling, not a target.
- Threshold occurs every other week during month one and replaces a short easy run.
- The HR ceiling is provisional and may be changed only through an explicit reviewed setting/rule update, never automatic day-to-day drift.

### Strength

- Progress after two similar successful exposures.
- Add reps to the top of the prescribed range, then use the smallest practical weight increase.
- At home, before requiring new equipment, use reps, slower tempo, pauses, increased range, or unilateral work.
- No progression if difficulty was excessive, form failed, pain rose, prescribed work was incomplete, or recovery criteria failed.

## Explanation requirements

Every changed workout stores a reason code, relevant before/after values, old and new prescription, and a concise explanation. Examples:

- `KNEE_WORSENING_3_5`: “Knee discomfort increased from 3 to 4, so today’s lower-body workout became upper-body and core.”
- `RECOVERY_MULTI_SIGNAL`: “Energy and sleep were low and fatigue was 4/5, so today’s run was shortened.”
- `MISSED_REBALANCE`: “Thursday’s workout was missed, so the remaining week was rebalanced without carrying it forward.”

## Recalculation timing

- After morning check-in: confirm/adapt today and remaining week.
- After workout: show preliminary tomorrow impact.
- Next morning: confirm using the new knee score.
- After material edit or unplanned load: recalculate.
- Same inputs must produce the same result and must not duplicate history.
