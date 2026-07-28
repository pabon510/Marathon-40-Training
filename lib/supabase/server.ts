import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Server Supabase client for use in Server Components, Route Handlers, and
 * Server Actions. Uses the public anon key plus the caller's session cookie
 * so Postgres RLS (auth.uid()) still applies — this is intentional: server
 * code must not use the service-role key to bypass RLS.
 */
export async function createClient() {
  const env = getEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render; middleware refreshes
            // the session instead. Safe to ignore.
          }
        },
      },
    },
  );
}
