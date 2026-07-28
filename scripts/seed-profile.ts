/**
 * Optional local/CI convenience wrapper around the same idempotent seed
 * logic used by the in-app POST /api/admin/seed route (see
 * app/api/admin/seed/route.ts). Most users don't need this script at all —
 * log into the deployed app and use the "Set up profile" button instead.
 *
 * This script exists for local development and CI, where looking the user
 * up by SEED_USER_EMAIL (rather than an active session) makes sense.
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, and SEED_USER_EMAIL. Run with `npm run seed`.
 */
import "dotenv/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedExerciseLibrary } from "@/lib/seed/exerciseLibrary";
import { seedProfileForUser } from "@/lib/seed/profile";

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  const admin = createAdminClient();

  console.log("Upserting exercise library...");
  const { exerciseCount, templateCount } = await seedExerciseLibrary(admin);
  console.log(`Upserted ${exerciseCount} exercises and ${templateCount} strength templates.`);

  const email = process.env.SEED_USER_EMAIL;
  if (!email) {
    console.warn("SEED_USER_EMAIL not set — skipping profile seed.");
    return;
  }

  const userId = await findUserIdByEmail(admin, email);
  if (!userId) {
    console.warn(
      `No auth user found for SEED_USER_EMAIL="${email}". Create the account first (see README), then re-run.`,
    );
    return;
  }

  const result = await seedProfileForUser(admin, userId);
  console.log(
    result === "created" ? `Seeded profile for ${email}.` : "Profile already exists — left live data untouched.",
  );
}

main()
  .then(() => console.log("Seed complete."))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
