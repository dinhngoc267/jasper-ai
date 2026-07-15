import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/set-password"];

/**
 * Refreshes the Supabase auth session for the incoming request and gates
 * `/admin/*` behind it. Called from `proxy.ts`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // `getClaims()` verifies the JWT LOCALLY (WebCrypto, no network round-trip)
  // because this project uses asymmetric JWT signing keys (ES256 — confirmed
  // present at `/auth/v1/.well-known/jwks.json`). This replaces the previous
  // `getUser()` call, which hit the Supabase auth server on EVERY navigation
  // and dominated proxy.ts latency (~140–650ms). The security boundary is
  // unchanged: the token's signature is still cryptographically verified — a
  // forged or expired cookie yields no claims. Do NOT swap this for
  // `getSession()`, which decodes without verifying.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (!isAuthenticated && !isPublicAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && pathname.startsWith("/admin/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}
