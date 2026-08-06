# Safety Rules

## Fueling boundaries

- Fueling guidance is education and workout planning, not medical nutrition treatment.
- Deterministic rules own product quantities and timing; runtime AI must not invent nutrient targets.
- The non-caffeinated Maurten Gel 100 is the default repeatable gel. Gel 100 CAF 100 is tracked separately because
  each serving adds 100 mg caffeine.
- The app must count all reported caffeine sources, honor `avoid` and high-sensitivity settings, and never present
  the FDA's general 400 mg/day healthy-adult reference as a performance target.
- The available 30 g protein shake covers a typical post-exercise protein serving but its 5 g carbohydrate does not
  make it a complete long-run recovery meal.
- Recommend professional medical or sports-dietitian guidance for relevant medical restrictions, eating-disorder
  history, persistent gastrointestinal symptoms, unexplained weight change, or aggressive weight-loss goals.

## Scope and disclaimer

The application is a training organizer, not a medical device and not a diagnosis or treatment service. It records symptoms and adjusts training conservatively. Display a concise disclaimer in settings and near safety interventions.

## Hard blocks

Running and lower-body strength are blocked when:

- Morning/pre-workout knee discomfort is 6 or higher.
- During the workout, knee discomfort reaches 6.
- During the workout, knee discomfort increases by 2 or more points from the starting value.

These blocks cannot be overridden. Alternatives: upper-body, core, gentle mobility, walking if comfortable, or rest. A hard block creates a safety event and recalculates the plan.

## Warnings outside the algorithm

Show a prominent recommendation to stop training and seek appropriate professional/urgent evaluation for reported:

- Inability to bear weight.
- Knee locking or giving way/instability.
- Significant swelling, deformity, or acute injury.
- Severe or rapidly escalating pain.
- Concerning chest pain, fainting, severe shortness of breath, or other emergency symptoms.

The UI must say to use emergency services for an emergency and must not give a diagnosis. These warning flags do not secretly replace the agreed pain/trend adaptation rules; they are explicit safety interventions.

## Exercise guidance

- Every lower-body exercise includes “stop or substitute if knee discomfort increases.”
- Do not prescribe Smith-machine exercises in V1.
- Do not prescribe adjustable-kettlebell swings.
- Avoid presenting hills as necessary during the base-rebuilding month.
- Walk breaks are normal successful execution, not failure.

## Override policy

- Non-blocked recommendations may be overridden after a warning/reason capture.
- A harder choice records the original recommendation, chosen workout, reason, and acknowledged warning.
- Hard-blocked running/lower-body work has no bypass in UI or API.
- Server-side authorization enforces blocks; hiding a button is insufficient.

## Privacy and account safety

- One private authenticated account; no public signup.
- RLS on all user data.
- Never expose Supabase service-role keys to the browser.
- Treat health/training data as sensitive: avoid logging raw check-ins in third-party analytics and redact secrets/identifiers from logs.

## Content language

Use “discomfort” or “reported pain,” “may,” and “consider professional evaluation.” Avoid “injury detected,” diagnoses, guarantees, or claims that strength prevents injury.
