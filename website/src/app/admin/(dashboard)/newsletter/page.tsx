import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/leads";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as the leads/people/orders pages.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Newsletter — Jasper AI Admin",
};

type NewsletterPerson = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  attributes: { how_they_heard?: string } | null;
  created_at: string;
};

/** Everyone with `ok_to_contact = true` — there is no separate newsletter
 * table, per the product plan. Returns null (not throws) if unreachable. */
async function fetchSubscribers(): Promise<NewsletterPerson[] | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("people")
      .select("id, name, email, company, attributes, created_at")
      .eq("ok_to_contact", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as NewsletterPerson[]) ?? [];
  } catch (err) {
    console.error("[admin] failed to load newsletter subscribers:", err);
    return null;
  }
}

export default async function AdminNewsletterPage() {
  const people = await fetchSubscribers();

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Newsletter
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          Everyone who opted in to occasional updates
          (<code className="font-mono text-xs">ok_to_contact = true</code>).
        </p>
      </header>

      {people === null || people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
          <p className="text-lg font-medium text-[var(--ink)]">
            No subscribers yet or database not connected
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
            {people !== null
              ? "Once someone opts in on the contact form, they'll show up here."
              : "The database isn't reachable yet. Set the environment variables and refresh."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--rule)] text-xs uppercase tracking-wider text-[var(--gray-2)]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">How they heard</th>
                <th className="px-4 py-3 font-semibold">Since</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr
                  key={person.id}
                  className="border-b border-[var(--rule)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink-soft)] text-xs font-semibold text-white">
                        {initials(person.name)}
                      </span>
                      <span className="font-medium text-[var(--ink)]">
                        {person.name || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">{person.email}</td>
                  <td className="px-4 py-3 text-[var(--gray-2)]">
                    {person.company || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--gray-2)]">
                    {person.attributes?.how_they_heard || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--gray-2)]">
                    {formatDate(person.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
