"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

/** The six pipeline stages a `contacts` row can be in — must match the
 * `contacts.status` CHECK constraint in 0001_build1_people_contacts.sql. */
const LEAD_STATUSES = [
  "new_lead",
  "contacted",
  "discovery_call",
  "proposal",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type UpdateLeadStatusResult = {
  success: boolean;
  error?: string;
};

function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

/**
 * Move a lead (a `contacts` row) to a new pipeline stage from the admin
 * Kanban board.
 *
 * 1. Read the row's current `status` + `person_id` first, so we know
 *    `from_status` — supabase-js's `.update().select()` only returns the
 *    *new* row, not the old one, so this has to be a separate read.
 * 2. Update `contacts.status`.
 * 3. Best-effort insert into `activity_log`. This is wrapped in its own
 *    try/catch: if the table doesn't exist yet (the 0002 migration hasn't
 *    been run in Supabase yet), that must NOT fail the status move itself —
 *    the operator can use the board before pasting the migration in. The
 *    real error is logged server-side either way.
 */
export async function updateLeadStatus(
  contactId: string,
  newStatus: string,
  note?: string
): Promise<UpdateLeadStatusResult> {
  if (!contactId) {
    return { success: false, error: "Missing lead id." };
  }

  if (!isLeadStatus(newStatus)) {
    return { success: false, error: "Unknown pipeline stage." };
  }

  try {
    const supabase = getSupabaseAdmin();

    // --- Read the current status + person_id before overwriting it ---
    const { data: current, error: readError } = await supabase
      .from("contacts")
      .select("status, person_id")
      .eq("id", contactId)
      .single();

    if (readError) throw readError;

    const fromStatus = current.status as string;
    const personId = current.person_id as string;

    // --- Update the pipeline stage ---
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ status: newStatus })
      .eq("id", contactId);

    if (updateError) throw updateError;

    // --- Best-effort activity log (never blocks the move above) ---
    try {
      const trimmedNote = note?.trim();
      const { error: logError } = await supabase.from("activity_log").insert({
        contact_id: contactId,
        person_id: personId,
        from_status: fromStatus,
        to_status: newStatus,
        actor: "admin",
        note: trimmedNote ? trimmedNote : null,
      });
      if (logError) throw logError;
    } catch (logErr) {
      console.error(
        "[leads] activity_log insert failed (status move still succeeded):",
        logErr
      );
    }

    return { success: true };
  } catch (err) {
    console.error("[leads] failed to update lead status:", err);
    return {
      success: false,
      error: "Couldn't move this lead. Please try again.",
    };
  }
}
