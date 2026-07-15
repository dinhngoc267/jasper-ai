"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ActivityLogRow } from "@/lib/leads";
import type { PersonContactRow, PersonOrderRow } from "@/lib/people";

export type PersonDetail = {
  contacts: PersonContactRow[];
  activity: ActivityLogRow[];
  orders: PersonOrderRow[];
};

/**
 * Load a single person's related data — inquiries, status-change history, and
 * orders — on demand when their drawer opens in the People directory.
 *
 * The list page no longer bulk-loads the contacts / activity_log / orders
 * tables (that would defeat server pagination); it fetches only the current
 * page of people, and this action lazily fetches the rest per person.
 *
 * `activity_log` and `orders` may not exist if migrations 0002/0003 never ran,
 * so their errors degrade to empty arrays (same best-effort fallback the
 * dashboard already uses) rather than failing the whole drawer.
 */
export async function getPersonDetail(personId: string): Promise<PersonDetail> {
  const supabase = getSupabaseAdmin();

  const [contactsRes, ordersRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, person_id, type, subject, message, source, status, created_at")
      .eq("person_id", personId)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, person_id, product_name, amount_cents, currency, status, created_at")
      .eq("person_id", personId)
      .order("created_at", { ascending: false }),
  ]);

  const contacts = contactsRes.error
    ? []
    : (contactsRes.data as unknown as PersonContactRow[]) ?? [];
  const orders = ordersRes.error
    ? []
    : (ordersRes.data as unknown as PersonOrderRow[]) ?? [];

  // Status history is keyed by contact, so only fetch it once we know this
  // person's contact ids (skip the round-trip entirely if they have none).
  let activity: ActivityLogRow[] = [];
  const contactIds = contacts.map((c) => c.id);
  if (contactIds.length > 0) {
    const activityRes = await supabase
      .from("activity_log")
      .select("id, contact_id, from_status, to_status, actor, note, created_at")
      .in("contact_id", contactIds)
      .order("created_at", { ascending: true });
    activity = activityRes.error
      ? []
      : (activityRes.data as unknown as ActivityLogRow[]) ?? [];
  }

  return { contacts, activity, orders };
}
