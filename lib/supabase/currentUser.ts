import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user, or null.
 *
 * Wrapped in React's `cache()` so every Server Component rendered for a
 * single request (the layout, the page, any nested component) shares one
 * Supabase Auth network round-trip instead of each one re-verifying the
 * session from scratch. `cache()` here is per-request memoization, not a
 * cross-request cache — Next.js clears it between requests, so this never
 * leaks one user's session into another's.
 *
 * Before this, every navigation paid for `auth.getUser()` twice: once in
 * `app/(app)/layout.tsx`, once again in the page. That duplicated
 * round-trip was a meaningful chunk of the "delay when clicking between
 * the bottom menu."
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
