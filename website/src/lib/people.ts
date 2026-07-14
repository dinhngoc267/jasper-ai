/**
 * Shared types and helpers for the admin People directory. Deliberately has
 * NO server-only imports — same pattern as `@/lib/leads` and `@/lib/orders`
 * — so it can be imported from both the server-fetching page and its client
 * components.
 */
import type { PersonAttributes } from "./leads";

export type PersonRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  source_site: string | null;
  ok_to_contact: boolean;
  attributes: PersonAttributes | null;
  created_at: string;
  updated_at: string;
};

/** A `contacts` row without the joined person — the People page already has
 * the person and just needs to group inquiries by `person_id`. */
export type PersonContactRow = {
  id: string;
  person_id: string;
  type: string;
  subject: string | null;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
};

/** An `orders` row without the joined person — same reasoning. */
export type PersonOrderRow = {
  id: string;
  person_id: string;
  product_name: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

/** Case-insensitive substring match across name/email/company — the People
 * directory's client-side search, per the product plan's "at minimum filter
 * by name/email/company" requirement. */
export function matchesSearch(
  person: Pick<PersonRow, "name" | "email" | "company">,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [person.name, person.email, person.company]
    .filter((field): field is string => Boolean(field))
    .some((field) => field.toLowerCase().includes(q));
}
