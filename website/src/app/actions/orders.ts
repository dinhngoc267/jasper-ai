"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

export type AddOrderState = {
  success: boolean;
  error?: string;
};

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function field(formData: FormData, key: string): string {
  return formData.get(key)?.toString().trim() ?? "";
}

/**
 * Record an order against an existing person, looked up by email.
 *
 * Unlike the contact form's upsert-by-email (`actions/contact.ts`), this
 * only ever looks a person up — it never creates one. An order with no
 * matching person is a data-entry mistake (wrong email), not a new contact,
 * so it surfaces as a user-facing error instead of silently creating a
 * person record.
 */
export async function addOrder(
  _prevState: AddOrderState,
  formData: FormData
): Promise<AddOrderState> {
  const email = field(formData, "email");
  const productName = field(formData, "product_name");
  const amountRaw = field(formData, "amount");
  const currency = (field(formData, "currency") || "usd").toLowerCase();
  const rawStatus = field(formData, "status") || "pending";

  if (!email || !productName || !amountRaw) {
    return {
      success: false,
      error: "Person's email, product name, and amount are required.",
    };
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Amount must be a positive number." };
  }
  const amountCents = Math.round(amount * 100);

  const status: OrderStatus = isOrderStatus(rawStatus) ? rawStatus : "pending";

  try {
    const supabase = getSupabaseAdmin();

    // --- Look up the person by email; never create one here ---
    const { data: person, error: lookupError } = await supabase
      .from("people")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!person) {
      return {
        success: false,
        error: `No person found with email ${email}. Add them via the contact form or People directory first.`,
      };
    }

    const { error: insertError } = await supabase.from("orders").insert({
      person_id: person.id,
      product_name: productName,
      amount_cents: amountCents,
      currency,
      status,
    });

    if (insertError) throw insertError;

    // Refresh the Orders list and the person's record so the new order shows
    // immediately, without a manual reload.
    revalidatePath("/admin/orders");
    revalidatePath("/admin/people");

    return { success: true };
  } catch (err) {
    console.error("[orders] failed to add order:", err);
    return {
      success: false,
      error: "Couldn't add this order. Please try again.",
    };
  }
}
