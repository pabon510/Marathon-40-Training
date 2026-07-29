import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <SeedProfileButton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      <SettingsForm profile={profile} />

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900">Disclaimer</h2>
        <p className="mt-1 text-xs text-slate-600">
          This app is a training organizer, not a medical device and not a diagnosis or treatment service. It
          records reported symptoms and adjusts training conservatively. For inability to bear weight, locking or
          giving way, significant swelling or deformity, severe or rapidly escalating pain, or emergency symptoms
          like chest pain or fainting, stop training and use emergency services or seek professional evaluation as
          appropriate.
        </p>
      </div>
    </div>
  );
}
