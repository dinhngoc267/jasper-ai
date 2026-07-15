import { formatDate, initials } from "@/lib/leads";

export type NewsletterPerson = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  attributes: { how_they_heard?: string } | null;
  created_at: string;
};

/**
 * Presentational table for one server-fetched page of subscribers. Search, the
 * "how they heard" filter, and pagination all happen in the query
 * (`newsletter/page.tsx`) via URL params — this just renders its rows.
 */
export function NewsletterTable({ people }: { people: NewsletterPerson[] }) {
  return (
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
  );
}
