/**
 * Weekday-morning internal digest (BUILD 3, part 4). Triggered by Vercel
 * Cron (see `vercel.json`'s `crons` entry) — Vercel calls this route on
 * schedule with an `Authorization: Bearer <CRON_SECRET>` header, which is
 * checked below the same way Vercel's own docs recommend. Deliberately a
 * plain Route Handler (not behind `/admin`) since `proxy.ts`'s matcher only
 * covers `/admin/:path*` — this route's own auth check is what protects it.
 *
 * Not wired into `/admin`'s login gate on purpose: Vercel Cron can't carry a
 * browser session cookie, so this needs its own secret-based check instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ActivityLogRow, LeadRow } from "@/lib/leads";
import { buildDigestData } from "@/lib/digest";
import { DigestEmail } from "@/emails/digest-email";

export const dynamic = "force-dynamic";

type OrderRow = { amount_cents: number; status: string; created_at: string };

function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://jasper-ai-neon.vercel.app";
}

async function fetchLeadsForDigest(): Promise<LeadRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contacts")
    .select(
      "id, person_id, type, subject, message, source, status, created_at, metadata, people ( id, name, email, company, attributes, created_at )"
    );
  if (error) throw error;
  return (data as unknown as LeadRow[]) ?? [];
}

async function fetchActivity(): Promise<ActivityLogRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, contact_id, from_status, to_status, actor, note, created_at");
  if (error) throw error;
  return (data as unknown as ActivityLogRow[]) ?? [];
}

async function fetchOrders(): Promise<OrderRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("amount_cents, status, created_at");
  if (error) throw error;
  return (data as unknown as OrderRow[]) ?? [];
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/digest] CRON_SECRET is not configured — refusing to run.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // `now` is read once, outside any try/catch — a fixed instant for this run,
  // not re-evaluated per query. `GET` is a plain Route Handler, not a React
  // component, so the react-hooks "purity" rule's render-impurity concern
  // doesn't apply here — same false-positive pattern already accepted
  // elsewhere in this codebase (see `leads-board.tsx`'s `moveLead`).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  let data;
  try {
    const [leads, activity, orders] = await Promise.all([
      fetchLeadsForDigest(),
      fetchActivity(),
      fetchOrders(),
    ]);
    data = buildDigestData(leads, activity, orders, now);
  } catch (err) {
    console.error("[cron/digest] failed to build digest data:", err);
    return NextResponse.json({ error: "Failed to build digest" }, { status: 500 });
  }

  // JSX is constructed here, outside any try/catch: React doesn't render it
  // immediately on construction, so wrapping it in try/catch wouldn't
  // actually catch rendering errors (an error boundary would be needed for
  // that) — see
  // https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary.
  // An uncaught error from `render()` below still surfaces as a 500 via
  // Next.js's default route-handler error handling.
  const email = <DigestEmail data={data} siteUrl={siteUrl()} />;
  const html = await render(email);

  // Local/manual preview: `?preview=1` returns the rendered HTML directly
  // instead of sending it, so the email can be eyeballed in a browser
  // without spending a Resend send or waiting for a cron tick. Still behind
  // the same CRON_SECRET check above.
  if (request.nextUrl.searchParams.get("preview")) {
    return new NextResponse(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      // Resend sandbox mode can only deliver to the account's own verified
      // email — matches the same constraint noted in `app/actions/contact.ts`
      // until jasper-ai.com is bought and verified as a sending domain.
      to: "jasper.le@edge8.ai",
      subject:
        data.totalStale > 0
          ? `Morning pulse — ${data.totalStale} lead${data.totalStale === 1 ? "" : "s"} need a nudge`
          : "Morning pulse — pipeline is clean",
      html,
    });

    if (error) throw error;

    return NextResponse.json({ sent: true, totalStale: data.totalStale });
  } catch (err) {
    console.error("[cron/digest] failed to send digest email:", err);
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 });
  }
}
