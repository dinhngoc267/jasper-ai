"use server";

export type ContactState = {
  success: boolean;
  error?: string;
};

export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Required fields
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!name || !email || !message) {
    return { success: false, error: "Name, email, and message are required." };
  }

  // Assemble the full inquiry payload. This shape mirrors what Build 1 will
  // persist: a `people` row (upserted by email, with the custom attributes)
  // and a linked `contacts` row. The stub reads every field so the form
  // contract is stable before the database is wired.
  const payload = {
    name,
    email,
    message,
    company: formData.get("company")?.toString().trim() ?? "",
    type: formData.get("type")?.toString().trim() ?? "general_inquiry",
    attributes: {
      how_they_heard: formData.get("how_they_heard")?.toString().trim() ?? "",
      company_size: formData.get("company_size")?.toString().trim() ?? "",
      estimated_budget:
        formData.get("estimated_budget")?.toString().trim() ?? "",
    },
    ok_to_contact: formData.get("ok_to_contact") != null,
  };

  // Frontend-only phase: log the received inquiry so submissions are visible in
  // the dev server output. No database writes yet.
  console.info("[contact] inquiry received:", payload);

  // TODO(Build 1): insert into Supabase — upsert `people` by email (attributes +
  // ok_to_contact), then create a linked `contacts` row of `type` in status
  // 'new_lead' (see docs/product/product-plan.md).
  // TODO(Build 2): send confirmation email via Resend once the sending domain
  // is bought and verified.

  return { success: true };
}
