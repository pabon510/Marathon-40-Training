import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "@/lib/supabase/types";
import type { ResolvedExerciseItem } from "@/lib/services/workoutContentService";
import { getRecentExerciseHistory } from "@/lib/services/strengthHistoryService";
import {
  buildLoadRecommendation,
  type ExerciseExposure,
  type LoadRecommendation,
} from "@/domain/progression/loadRecommendation";
import { getExerciseLoadMetadata, type ExerciseLoadMetadata } from "@/domain/content/loadMetadata";

type Client = SupabaseClient<Database>;

export interface GuidedExerciseItem extends ResolvedExerciseItem {
  recommendation: LoadRecommendation;
  history: ExerciseExposure[];
  /**
   * Resolved from the curated code library by slug, not from the database
   * row — see domain/content/loadMetadata.ts for why.
   */
  loadMetadata: ExerciseLoadMetadata;
}

interface HomeEquipment {
  dumbbellsLb?: number[];
  adjustableKettlebellLb?: number[];
}

/**
 * At home, "heavier equipment available" means the last load used is below
 * the heaviest implement on hand — otherwise progression has to come from
 * reps/tempo/pauses/range instead of adding weight. At the gym we assume a
 * heavier setting always exists.
 */
function hasHeavierEquipment(
  location: "gym" | "home",
  lastLoad: number | null,
  profile: Pick<ProfileRow, "equipment">,
): boolean {
  if (location === "gym") return true;
  if (lastLoad === null) return true;
  const equipment = profile.equipment as { home?: HomeEquipment } | null;
  const home = equipment?.home ?? {};
  const heaviest = Math.max(
    0,
    ...(home.dumbbellsLb ?? []),
    ...(home.adjustableKettlebellLb ?? []),
  );
  return heaviest > lastLoad;
}

/** Attaches per-exercise load history and today's recommendation to a resolved workout. */
export async function attachLoadGuidance(
  supabase: Client,
  userId: string,
  profile: Pick<ProfileRow, "equipment">,
  items: ResolvedExerciseItem[],
  location: "gym" | "home",
): Promise<GuidedExerciseItem[]> {
  const historyByExercise = await getRecentExerciseHistory(
    supabase,
    userId,
    items.map((i) => i.exercise.id),
  );

  return items.map((item) => {
    const history = historyByExercise.get(item.exercise.id) ?? [];
    const lastLoad = history[0]?.loadValue ?? null;
    const loadMetadata = getExerciseLoadMetadata(item.exercise.slug);
    const recommendation = buildLoadRecommendation(
      history,
      {
        setCount: item.setCount,
        repRangeLow: item.repRangeLow,
        repRangeHigh: item.repRangeHigh,
      },
      {
        metadata: loadMetadata,
        location,
        hasHeavierEquipmentAvailable: hasHeavierEquipment(location, lastLoad, profile),
      },
    );
    return { ...item, recommendation, history, loadMetadata };
  });
}
