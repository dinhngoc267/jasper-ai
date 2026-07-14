import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated with the service-role key.
 *
 * SECURITY: the service-role key bypasses Row Level Security and must NEVER
 * reach the browser. The `server-only` import above makes the build fail if
 * this module is ever pulled into a client component. Do not import it from
 * any file with `"use client"`.
 *
 * Lazily created so that simply importing this module (e.g. during
 * `next build`) does not require the env vars to be present — they are only
 * read when a request actually needs the database.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in the environment (see .env.example)."
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      // Server-side, single-shot usage — no session persistence or refresh.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
