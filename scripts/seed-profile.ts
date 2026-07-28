/**
 * Idempotent seed script:
 *  - Upserts the curated exercise library (reference content, safe to
 *    update on every run since it's not user data).
 *  - Inserts the single manually-created user's profile from
 *    config/profile.json ONLY if no profile row exists yet for them. Never
 *    overwrites a live profile.
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * and SEED_USER_EMAIL (the manually created account's email). Run with
 * `npm run seed`.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXERCISES, TEMPLATES } from "@/domain/content/exerciseLibrary";

interface ProfileConfig {
  displayName: string;
  timezone: string;
  targetMarathonDate: string | null;
  phase: "base_rebuilding";
  easyHrFloor: number;
  easyHrCeiling: number;
  calibrationEndDate: string | null;
  preferredLongRunDay: "saturday" | "sunday";
  defaultAvailableWeekdays: string[];
  equipment: unknown;
  reminderPreferences: unknown;
  baselineVersion: number;
}

async function seedExerciseLibrary(admin: ReturnType<typeof createAdminClient>) {
  console.log(`Upserting ${EXERCISES.length} exercise definitions...`);
  const exerciseIdBySlug = new Map<string, string>();

  for (const exercise of EXERCISES) {
    const { data, error } = await admin
      .from("exercise_definitions")
      .upsert(
        {
          slug: exercise.slug,
          name: exercise.name,
          movement_pattern: exercise.movementPattern,
          target_muscles: exercise.targetMuscles,
          equipment: exercise.equipment,
          setup: exercise.setup,
          execution: exercise.execution,
          cues: exercise.cues,
          mistakes: exercise.mistakes,
          stop_substitute_guidance: exercise.stopSubstituteGuidance,
          is_lower_body: exercise.isLowerBody,
          active: true,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert exercise "${exercise.slug}": ${error?.message}`);
    }
    exerciseIdBySlug.set(exercise.slug, data.id);
  }

  console.log("Replacing exercise variants for each exercise...");
  for (const exercise of EXERCISES) {
    const exerciseId = exerciseIdBySlug.get(exercise.slug)!;
    // Variants are reference data derived entirely from the exercise slug;
    // delete-and-reinsert keeps this idempotent without needing a natural
    // unique key across (exercise, location, equivalence_group).
    const { error: deleteError } = await admin.from("exercise_variants").delete().eq("exercise_id", exerciseId);
    if (deleteError) throw new Error(`Failed to clear variants for "${exercise.slug}": ${deleteError.message}`);

    if (exercise.variants.length === 0) continue;
    const { error: insertError } = await admin.from("exercise_variants").insert(
      exercise.variants.map((v) => ({
        exercise_id: exerciseId,
        location: v.location,
        equipment_requirements: v.equipmentRequirements,
        progression_methods: v.progressionMethods,
        contraindication_tags: v.contraindicationTags,
        equivalence_group: v.equivalenceGroup,
        is_short_option: v.isShortOption,
      })),
    );
    if (insertError) throw new Error(`Failed to insert variants for "${exercise.slug}": ${insertError.message}`);
  }

  console.log(`Upserting ${TEMPLATES.length} strength templates...`);
  for (const template of TEMPLATES) {
    const { data, error } = await admin
      .from("strength_templates")
      .upsert(
        {
          slug: template.slug,
          name: template.name,
          goal: template.goal,
          emphasis: template.emphasis,
          duration_minutes: template.durationMinutes,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert template "${template.slug}": ${error?.message}`);
    }

    const { error: deleteError } = await admin
      .from("strength_template_items")
      .delete()
      .eq("template_id", data.id);
    if (deleteError) throw new Error(`Failed to clear items for "${template.slug}": ${deleteError.message}`);

    const { error: insertError } = await admin.from("strength_template_items").insert(
      template.items.map((item) => ({
        template_id: data.id,
        ordinal: item.ordinal,
        equivalence_group: item.equivalenceGroup,
        set_count: item.setCount,
        rep_range_low: item.repRangeLow,
        rep_range_high: item.repRangeHigh,
        rest_seconds: item.restSeconds,
        is_optional: item.isOptional,
        is_finisher: item.isFinisher,
        include_in_short_version: item.includeInShortVersion,
      })),
    );
    if (insertError) throw new Error(`Failed to insert items for "${template.slug}": ${insertError.message}`);
  }
}

async function seedProfile(admin: ReturnType<typeof createAdminClient>) {
  const email = process.env.SEED_USER_EMAIL;
  if (!email) {
    console.warn("SEED_USER_EMAIL not set — skipping profile seed. Set it in .env.local once the account exists.");
    return;
  }

  const configPath = resolve(process.cwd(), "config/profile.json");
  const config: ProfileConfig = JSON.parse(readFileSync(configPath, "utf-8"));

  let userId: string | null = null;
  let page = 1;
  while (!userId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      userId = match.id;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!userId) {
    console.warn(
      `No auth user found for SEED_USER_EMAIL="${email}". Create the account first (see README/Supabase setup), then re-run the seed.`,
    );
    return;
  }

  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to check existing profile: ${existingError.message}`);

  if (existing) {
    console.log("Profile already exists for this user — leaving live data untouched.");
    return;
  }

  const { error: insertError } = await admin.from("profiles").insert({
    user_id: userId,
    display_name: config.displayName,
    timezone: config.timezone,
    target_marathon_date: config.targetMarathonDate,
    phase: config.phase,
    easy_hr_floor: config.easyHrFloor,
    easy_hr_ceiling: config.easyHrCeiling,
    calibration_end_date: config.calibrationEndDate,
    preferred_long_run_day: config.preferredLongRunDay,
    default_available_weekdays: config.defaultAvailableWeekdays,
    equipment: config.equipment,
    reminder_preferences: config.reminderPreferences,
    baseline_version: config.baselineVersion,
  });

  if (insertError) throw new Error(`Failed to insert profile: ${insertError.message}`);
  console.log(`Seeded profile for ${email}.`);
}

async function main() {
  const admin = createAdminClient();
  await seedExerciseLibrary(admin);
  await seedProfile(admin);
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
