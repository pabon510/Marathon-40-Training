import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, SideNav } from "@/components/nav";
import { OfflineBanner } from "@/components/offline-banner";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: middleware already redirects unauthenticated
  // requests, but every server-rendered layout re-checks so a stale/expired
  // session can never render private data.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="flex min-h-dvh flex-1 flex-col">
        <OfflineBanner />
        <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-3 md:flex">
          <p className="text-sm text-slate-500">Base rebuilding · private training log</p>
          <form action={signOut}>
            <button type="submit" className="btn-secondary">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 pb-20 md:pb-6">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-8 md:py-6">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
