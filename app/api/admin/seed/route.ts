import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedExerciseLibrary } from "@/lib/seed/exerciseLibrary";
import { seedProfileForUser } from "@/lib/seed/profile";

/**
 * One-click setup endpoint: upserts the exercise library and creates the
 * caller's own profile if one doesn't exist yet. Gated by requiring an
 * authenticated Supabase session — the same account created manually in
 * Supabase Auth — so this needs no separate secret. Never overwrites an
 * existing profile. Uses the service-role key server-side only; that key
 * is never sent to the browser.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first, then run setup." }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not set for this deployment. Add it in Vercel's Environment Variables (Project Settings -> Environment Variables), then redeploy and try again.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  try {
    const { exerciseCount, templateCount } = await seedExerciseLibrary(admin);
    const profileResult = await seedProfileForUser(admin, user.id);

    return NextResponse.json({
      ok: true,
      exerciseCount,
      templateCount,
      profile: profileResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed." },
      { status: 500 },
    );
  }
}
