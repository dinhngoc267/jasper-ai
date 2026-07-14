import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for the admin login session (anon key only —
 * never the service-role key). Used by the login/set-password forms to call
 * `auth.signInWithPassword` / `auth.updateUser`.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
