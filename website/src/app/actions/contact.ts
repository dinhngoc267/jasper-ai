"use server";

export type ContactState = {
  success: boolean;
  error?: string;
};

export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!name || !email || !message) {
    return { success: false, error: "All fields are required." };
  }

  // TODO(Build 1): insert into Supabase — upsert `people` by email, create linked
  // `contacts` row with status 'new_lead' (see Working Files/product-plan.md).
  // TODO(Build 2): send confirmation email via Resend once the sending domain
  // is bought and verified.

  return { success: true };
}
