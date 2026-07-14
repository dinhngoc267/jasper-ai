"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ContactState = {
  success: boolean;
  error?: string;
};

/** Inquiry types accepted by the contacts.type CHECK constraint. */
const CONTACT_TYPES = [
  "ai_development_project",
  "ai_consulting",
  "ongoing_support",
  "general_inquiry",
] as const;

type ContactType = (typeof CONTACT_TYPES)[number];

const GENERIC_ERROR =
  "Something went wrong sending your inquiry. Please try again, or email jasper.le@edge8.ai directly.";

function field(formData: FormData, key: string): string {
  return formData.get(key)?.toString().trim() ?? "";
}

/**
 * Persist a contact-form submission as a lead.
 *
 * 1. UPSERT the person by email (never duplicated), merging the custom
 *    attributes (how_they_heard, company_size, estimated_budget) into the
 *    existing `attributes` jsonb so repeat submits enrich rather than clobber.
 * 2. INSERT a linked `contacts` row in status 'new_lead'.
 *
 * All access is server-side via the service-role key. Real errors are logged
 * on the server; the visitor only ever sees a friendly message.
 */
export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  // --- Read + validate required fields ---
  const name = field(formData, "name");
  const email = field(formData, "email");
  const message = field(formData, "message");

  if (!name || !email || !message) {
    return { success: false, error: "Name, email, and message are required." };
  }

  // --- Normalise inquiry type against the enum ---
  const rawType = field(formData, "type");
  const type: ContactType = (CONTACT_TYPES as readonly string[]).includes(
    rawType
  )
    ? (rawType as ContactType)
    : "general_inquiry";

  const company = field(formData, "company");
  const okToContact = formData.get("ok_to_contact") != null;

  // --- Build the custom attributes, dropping empty values ---
  const attributes: Record<string, string> = {};
  const howTheyHeard = field(formData, "how_they_heard");
  const companySize = field(formData, "company_size");
  const estimatedBudget = field(formData, "estimated_budget");
  if (howTheyHeard) attributes.how_they_heard = howTheyHeard;
  if (companySize) attributes.company_size = companySize;
  if (estimatedBudget) attributes.estimated_budget = estimatedBudget;

  try {
    const supabase = getSupabaseAdmin();

    // --- Upsert the person, preserving existing attributes on conflict ---
    // Fetch the current row (if any) so we merge attributes rather than
    // overwrite ones from a previous submission.
    const { data: existing, error: lookupError } = await supabase
      .from("people")
      .select("attributes")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const existingAttributes =
      (existing?.attributes as Record<string, unknown> | null) ?? {};
    const mergedAttributes = { ...existingAttributes, ...attributes };

    const { data: person, error: upsertError } = await supabase
      .from("people")
      .upsert(
        {
          email,
          name,
          company: company || null,
          ok_to_contact: okToContact,
          source_site: "jasper-ai",
          attributes: mergedAttributes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (upsertError) throw upsertError;

    // --- Insert the linked inquiry (defaults to status 'new_lead') ---
    const { error: contactError } = await supabase.from("contacts").insert({
      person_id: person.id,
      type,
      message,
      source: "website",
    });

    if (contactError) throw contactError;

    return { success: true };
  } catch (err) {
    // Log the real error server-side; never leak details (or secrets) to the client.
    console.error("[contact] failed to persist inquiry:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
