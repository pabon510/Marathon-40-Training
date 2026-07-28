import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message:
      "NEXT_PUBLIC_SUPABASE_URL is missing or invalid. Set it in .env.local (see .env.example).",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Set it in .env.local.",
  }),
  APP_TIMEZONE: z.string().default("America/New_York"),
});

let cached: z.infer<typeof serverSchema> | null = null;

/** Validates required env vars once and caches the parsed result. */
export function getEnv() {
  if (cached) return cached;
  const parsed = serverSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
  });
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(" ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  cached = parsed.data;
  return cached;
}

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/New_York";
