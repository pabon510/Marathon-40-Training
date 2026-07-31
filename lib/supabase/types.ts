/**
 * Hand-authored Supabase Database types mirroring supabase/migrations/*.sql.
 * There is no live project to run `supabase gen types` against yet; once one
 * exists, `supabase gen types typescript --linked` can replace this file.
 * Keep both in sync manually until then.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * `Relationships: []` satisfies postgrest-js's GenericTable/GenericView
 * constraint. This app doesn't use PostgREST's embedded-resource `select`
 * syntax (`.select("*, other_table(*)")`) — joins are done in application
 * code — so an empty relationship list is accurate, not a placeholder.
 */
type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ViewDef<Row> = {
  Row: Row;
  Relationships: [];
};

/** Builds an Insert type: `Required` keys must be provided; every other column (id, timestamps, DB-defaulted columns) is optional. */
type Insertable<Row, Required extends keyof Row> = Partial<Omit<Row, Required>> & Pick<Row, Required>;

export interface ProfileRow {
  user_id: string;
  display_name: string;
  timezone: string;
  target_marathon_date: string | null;
  phase: "base_rebuilding";
  easy_hr_floor: number;
  easy_hr_ceiling: number;
  calibration_end_date: string | null;
  preferred_long_run_day: "saturday" | "sunday";
  default_available_weekdays: string[];
  equipment: Json;
  reminder_preferences: Json;
  baseline_version: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklySetupRow {
  id: string;
  user_id: string;
  week_start_date: string;
  available_dates: string[];
  intended_long_run_date: string;
  backup_long_run_date: string;
  active_recovery_choices: Json;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface PlanVersionRow {
  id: string;
  user_id: string;
  rolling_start_date: string;
  version_number: number;
  trigger: "initial" | "check_in" | "post_workout" | "missed" | "edit" | "unplanned";
  source_event_type: string | null;
  source_event_id: string | null;
  generated_at: string;
  is_active: boolean;
  created_at: string;
}

export interface PlannedWorkoutRow {
  id: string;
  plan_version_id: string;
  user_id: string;
  local_date: string;
  workout_kind: string;
  priority: number;
  status: string;
  goal: string;
  planned_duration_minutes: number;
  run_prescription: Json | null;
  strength_template_id: string | null;
  recovery_routine_slug: string | null;
  location_choice: "gym" | "home" | "unspecified" | null;
  run_context: "standard" | "stroller";
  shorter_alternative: Json | null;
  original_workout_id: string | null;
  completion_credit_factor: number;
  created_at: string;
  updated_at: string;
}

export interface PlanChangeRow {
  id: string;
  user_id: string;
  old_plan_version_id: string | null;
  new_plan_version_id: string;
  local_date: string;
  old_workout_summary: Json | null;
  new_workout_summary: Json;
  reason_code: string;
  explanation: string;
  triggering_values: Json;
  created_at: string;
}

export interface MorningCheckInRow {
  id: string;
  user_id: string;
  local_date: string;
  check_in_time: string;
  hours_slept: number | null;
  oura_score: number | null;
  energy: number | null;
  soreness: number | null;
  stress: number | null;
  fatigue: number | null;
  knee: number | null;
  available_time: "15" | "30" | "45" | "60" | "75" | "90_plus";
  strength_location: "gym" | "home" | null;
  skipped_fields: string[];
  refreshed_from_id: string | null;
  created_at: string;
}

export interface WorkoutSessionRow {
  id: string;
  user_id: string;
  planned_workout_id: string | null;
  local_date: string;
  session_type: "run" | "strength" | "cross_training" | "mobility" | "rest_active";
  location: "gym" | "home" | "outdoor" | "treadmill" | "n/a" | null;
  started_at: string | null;
  completed_at: string | null;
  completion_state: "full" | "partial" | "stopped" | "skipped";
  unplanned: boolean;
  override_flag: boolean;
  override_reason: string | null;
  modification_reason: string | null;
  overall_effort: number | null;
  expectation_result: "easier" | "as_expected" | "harder" | null;
  unusual_pain_flag: boolean;
  unusual_pain_details: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunLogRow {
  id: string;
  workout_session_id: string;
  run_type: "outdoor" | "treadmill" | "run_walk";
  distance_miles: number | null;
  duration_seconds: number | null;
  calculated_pace_seconds_per_mile: number | null;
  pace_override_seconds_per_mile: number | null;
  average_hr: number | null;
  maximum_hr: number | null;
  effort: number | null;
  elevation_gain_feet: number | null;
  highest_knee_during: number | null;
  knee_immediately_after: number | null;
  is_stroller: boolean;
  stroller_discomfort_areas: string[];
  import_id: string | null;
  data_source: "manual" | "garmin_screenshot";
  moving_duration_seconds: number | null;
  elapsed_duration_seconds: number | null;
  moving_pace_seconds_per_mile: number | null;
  best_pace_seconds_per_mile: number | null;
  elevation_loss_feet: number | null;
  aerobic_training_effect: number | null;
  anaerobic_training_effect: number | null;
  average_temperature_f: number | null;
  average_cadence_spm: number | null;
  maximum_cadence_spm: number | null;
  average_stride_length_meters: number | null;
  created_at: string;
  updated_at: string;
}

export interface RunImportRow {
  id: string;
  user_id: string;
  provider: "garmin_screenshot";
  status: "draft" | "confirmed" | "discarded";
  model: string;
  parser_version: string;
  image_count: number;
  extracted_payload: Json;
  run_log_id: string | null;
  created_at: string;
  confirmed_at: string | null;
  updated_at: string;
}

export interface RunImportImageRow {
  id: string;
  user_id: string;
  run_import_id: string;
  ordinal: number;
  storage_path: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  byte_size: number;
  expires_at: string;
  keep_permanently: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface RunAnalysisRow {
  id: string;
  user_id: string;
  run_log_id: string;
  status: "pending" | "completed" | "failed" | "stale";
  analysis_version: string;
  prompt_version: string;
  rules_version: string;
  model: string;
  evidence_snapshot: Json;
  structured_result: Json | null;
  error_message: string | null;
  generated_at: string | null;
  next_morning_result: Json | null;
  next_morning_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunSplitRow {
  id: string;
  run_log_id: string;
  ordinal: number;
  split_distance_miles: number;
  duration_seconds: number;
  created_at: string;
}

export interface StrengthLogRow {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  ordinal: number;
  prescribed_variant_id: string | null;
  completed_sets: number | null;
  representative_reps: number | null;
  max_reps: number | null;
  load_value: number | null;
  load_unit: "lb" | "kg" | "bodyweight" | "band" | "n/a" | null;
  difficulty: number | null;
  substitution_exercise_id: string | null;
  notes: string | null;
  load_type: "weighted" | "bodyweight" | "band" | "machine" | null;
  band_level: "light" | "medium" | "heavy" | null;
  rep_basis: "total" | "per_side" | null;
  skipped_fields: string[];
  completed_seconds: number | null;
  completed_distance_feet: number | null;
  completed_steps: number | null;
  tempo_used: string | null;
  assistance_note: string | null;
  pain_increased: boolean | null;
  form_failed: boolean | null;
  recovery_acceptable: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface StrengthSetLogRow {
  id: string;
  strength_log_id: string;
  set_number: number;
  reps: number | null;
  load_value: number | null;
  created_at: string;
}

export interface PostWorkoutCheckInRow {
  id: string;
  workout_session_id: string;
  overall_effort: number;
  highest_knee_during: number;
  knee_immediately_after: number;
  completed_full: boolean;
  expectation_result: "easier" | "as_expected" | "harder";
  unusual_pain_flag: boolean;
  unusual_pain_details: string | null;
  notes: string | null;
  submitted_at: string;
}

export interface ExerciseDefinitionRow {
  id: string;
  slug: string;
  name: string;
  movement_pattern: string;
  target_muscles: string[];
  equipment: string[];
  setup: string;
  execution: string;
  cues: Json;
  mistakes: Json;
  stop_substitute_guidance: string;
  is_lower_body: boolean;
  active: boolean;
  load_basis: "machine_total" | "per_dumbbell" | "per_hand" | "single_implement" | "bodyweight" | "band";
  default_load_type: "weighted" | "bodyweight" | "band" | "machine";
  rep_basis: "total" | "per_side";
  loading_instructions: string;
  load_position: string;
  start_load_note: string;
  load_increment_lb: number;
  family_slug: string | null;
  programming_role: "primary" | "secondary" | "accessory" | "regression" | "progression" | "safety_alternative" | "warmup" | null;
  prescription_metric: "reps" | "seconds" | "distance_feet" | "steps" | "breaths";
  side_mode: "bilateral" | "alternating" | "per_side";
  default_tempo: string | null;
  default_duration_seconds: number | null;
  default_distance_feet: number | null;
  history_compatibility: "exact_only" | "same_family";
  safety_alternative_eligible: boolean;
  active_for_new_plans: boolean;
  legacy_display_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseVariantRow {
  id: string;
  exercise_id: string;
  location: "gym" | "home" | "either";
  equipment_requirements: string[];
  progression_methods: string[];
  contraindication_tags: string[];
  equivalence_group: string;
  is_short_option: boolean;
  selection_priority: number;
  programming_role: "primary" | "secondary" | "accessory" | "regression" | "progression" | "safety_alternative" | "warmup" | null;
  rotation_eligible: boolean;
  created_at: string;
}

export interface ExerciseHistoryCompatibilityRow {
  source_exercise_id: string;
  target_exercise_id: string;
  compatibility_scope: "display_only" | "progression_same_loading";
  notes: string;
  created_at: string;
}

export interface ExercisePreferenceRow {
  user_id: string;
  exercise_slug: string;
  preference: "prefer" | "avoid";
  created_at: string;
  updated_at: string;
}

export interface StrengthBlockSelectionRow {
  id: string;
  user_id: string;
  block_start_date: string;
  block_end_date: string;
  template_slug: string;
  slot_key: string;
  exercise_variant_id: string;
  reason_code: string;
  created_at: string;
  updated_at: string;
}

export interface PlannedStrengthItemRow {
  id: string;
  planned_workout_id: string;
  ordinal: number;
  template_item_id: string | null;
  exercise_variant_id: string;
  exercise_id: string;
  set_count: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
  prescription_metric: "reps" | "seconds" | "distance_feet" | "steps" | "breaths";
  selection_reason_code: string;
  created_at: string;
}

export interface PlannedExerciseSubstitutionRow {
  id: string;
  planned_workout_id: string;
  ordinal: number;
  original_exercise_id: string;
  substitute_exercise_id: string;
  reason_code: "prefer_machine" | "equipment_unavailable" | "uncomfortable" | "different_exercise" | "home_conversion";
  substitution_quality: "exact" | "close" | "general";
  created_at: string;
  updated_at: string;
}

export interface StrengthTemplateRow {
  id: string;
  slug: string;
  name: string;
  goal: string;
  emphasis: string;
  duration_minutes: number;
  created_at: string;
}

export interface StrengthTemplateItemRow {
  id: string;
  template_id: string;
  ordinal: number;
  equivalence_group: string;
  set_count: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
  is_optional: boolean;
  is_finisher: boolean;
  include_in_short_version: boolean;
  created_at: string;
}

export interface SafetyEventRow {
  id: string;
  user_id: string;
  source_type: "morning_check_in" | "workout_session" | "during_workout";
  source_id: string | null;
  rule_code: string;
  knee_start: number | null;
  knee_current: number | null;
  knee_change: number | null;
  blocked_workout_types: string[];
  offered_alternatives: string[];
  acknowledged_at: string | null;
  created_at: string;
}

export interface RuleEvaluationRow {
  id: string;
  user_id: string;
  source_type: "morning_check_in" | "workout_session" | "plan_generation" | "edit" | "unplanned";
  source_id: string | null;
  rule_set_version: string;
  inputs_snapshot: Json;
  matched_rules: string[];
  result: Json;
  explanation: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, Insertable<ProfileRow, "user_id">>;
      weekly_setups: TableDef<
        WeeklySetupRow,
        Insertable<WeeklySetupRow, "user_id" | "week_start_date" | "available_dates" | "intended_long_run_date" | "backup_long_run_date">
      >;
      plan_versions: TableDef<PlanVersionRow, Insertable<PlanVersionRow, "user_id" | "rolling_start_date" | "version_number" | "trigger">>;
      planned_workouts: TableDef<
        PlannedWorkoutRow,
        Insertable<
          PlannedWorkoutRow,
          "plan_version_id" | "user_id" | "local_date" | "workout_kind" | "goal" | "planned_duration_minutes"
        >
      >;
      plan_changes: TableDef<
        PlanChangeRow,
        Insertable<PlanChangeRow, "user_id" | "new_plan_version_id" | "local_date" | "new_workout_summary" | "reason_code" | "explanation">
      >;
      morning_check_ins: TableDef<MorningCheckInRow, Insertable<MorningCheckInRow, "user_id" | "local_date" | "available_time">>;
      workout_sessions: TableDef<
        WorkoutSessionRow,
        Insertable<WorkoutSessionRow, "user_id" | "local_date" | "session_type" | "completion_state">
      >;
      run_logs: TableDef<RunLogRow, Insertable<RunLogRow, "workout_session_id" | "run_type">>;
      run_imports: TableDef<
        RunImportRow,
        Insertable<RunImportRow, "user_id" | "model" | "parser_version" | "image_count">
      >;
      run_import_images: TableDef<
        RunImportImageRow,
        Insertable<RunImportImageRow, "user_id" | "run_import_id" | "ordinal" | "storage_path" | "mime_type" | "byte_size">
      >;
      run_analyses: TableDef<
        RunAnalysisRow,
        Insertable<RunAnalysisRow, "user_id" | "run_log_id" | "analysis_version" | "prompt_version" | "rules_version" | "model">
      >;
      run_splits: TableDef<RunSplitRow, Insertable<RunSplitRow, "run_log_id" | "ordinal" | "duration_seconds">>;
      strength_logs: TableDef<StrengthLogRow, Insertable<StrengthLogRow, "workout_session_id" | "exercise_id" | "ordinal">>;
      strength_set_logs: TableDef<StrengthSetLogRow, Insertable<StrengthSetLogRow, "strength_log_id" | "set_number">>;
      post_workout_check_ins: TableDef<
        PostWorkoutCheckInRow,
        Insertable<
          PostWorkoutCheckInRow,
          "workout_session_id" | "overall_effort" | "highest_knee_during" | "knee_immediately_after" | "completed_full" | "expectation_result"
        >
      >;
      exercise_definitions: TableDef<
        ExerciseDefinitionRow,
        Insertable<ExerciseDefinitionRow, "slug" | "name" | "movement_pattern" | "setup" | "execution" | "stop_substitute_guidance">
      >;
      exercise_variants: TableDef<ExerciseVariantRow, Insertable<ExerciseVariantRow, "exercise_id" | "location" | "equivalence_group">>;
      exercise_history_compatibility: TableDef<
        ExerciseHistoryCompatibilityRow,
        Insertable<ExerciseHistoryCompatibilityRow, "source_exercise_id" | "target_exercise_id" | "compatibility_scope" | "notes">
      >;
      exercise_preferences: TableDef<
        ExercisePreferenceRow,
        Insertable<ExercisePreferenceRow, "user_id" | "exercise_slug" | "preference">
      >;
      strength_block_selections: TableDef<
        StrengthBlockSelectionRow,
        Insertable<
          StrengthBlockSelectionRow,
          "user_id" | "block_start_date" | "block_end_date" | "template_slug" | "slot_key" | "exercise_variant_id" | "reason_code"
        >
      >;
      planned_strength_items: TableDef<
        PlannedStrengthItemRow,
        Insertable<
          PlannedStrengthItemRow,
          "planned_workout_id" | "ordinal" | "exercise_variant_id" | "exercise_id" | "set_count" | "rep_range_low" | "rep_range_high" | "selection_reason_code"
        >
      >;
      planned_exercise_substitutions: TableDef<
        PlannedExerciseSubstitutionRow,
        Insertable<
          PlannedExerciseSubstitutionRow,
          "planned_workout_id" | "ordinal" | "original_exercise_id" | "substitute_exercise_id" | "reason_code" | "substitution_quality"
        >
      >;
      strength_templates: TableDef<StrengthTemplateRow, Insertable<StrengthTemplateRow, "slug" | "name" | "goal" | "emphasis" | "duration_minutes">>;
      strength_template_items: TableDef<
        StrengthTemplateItemRow,
        Insertable<
          StrengthTemplateItemRow,
          "template_id" | "ordinal" | "equivalence_group" | "set_count" | "rep_range_low" | "rep_range_high"
        >
      >;
      safety_events: TableDef<SafetyEventRow, Insertable<SafetyEventRow, "user_id" | "source_type" | "rule_code">>;
      rule_evaluations: TableDef<
        RuleEvaluationRow,
        Insertable<RuleEvaluationRow, "user_id" | "source_type" | "inputs_snapshot" | "result" | "explanation">
      >;
    };
    Views: {
      v_daily_knee_scores: ViewDef<{ user_id: string; local_date: string; max_knee_score: number }>;
      v_weekly_knee_summary: ViewDef<{ user_id: string; week_start: string; weekly_max_knee: number }>;
      v_weekly_run_totals: ViewDef<{ user_id: string; week_start: string; total_run_minutes: number; total_run_miles: number }>;
      v_weekly_strength_completion: ViewDef<{ user_id: string; week_start: string; completed_sessions: number; logged_sessions: number }>;
      v_weekly_plan_completion: ViewDef<{ user_id: string; week_start: string; planned_count: number; credited_count: number }>;
      v_checkin_completion: ViewDef<{ user_id: string; week_start: string; workout_days: number; checked_in_days: number }>;
    };
    Functions: Record<string, never>;
  };
}
