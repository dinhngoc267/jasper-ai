import { getSupabaseAdmin } from "@/lib/supabase/server";

// Render on every request — never at build time (there is no database during
// `next build`). This keeps the build green without a database connection.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leads — Jasper AI Admin",
};

/** Shape of the custom attributes stored on people.attributes (jsonb). */
type PersonAttributes = {
  how_they_heard?: string;
  company_size?: string;
  estimated_budget?: string;
};

/** A contact row joined to its person, as returned by the query below. */
type LeadRow = {
  id: string;
  type: string;
  message: string | null;
  status: string;
  created_at: string;
  people: {
    name: string | null;
    email: string;
    company: string | null;
    attributes: PersonAttributes | null;
  } | null;
};

const TYPE_LABELS: Record<string, string> = {
  ai_development_project: "AI Development Project",
  ai_consulting: "AI Consulting",
  ongoing_support: "Ongoing Support",
  general_inquiry: "General Inquiry",
};

const STATUS_LABELS: Record<string, string> = {
  new_lead: "New lead",
  contacted: "Contacted",
  discovery_call: "Discovery call",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Fetch leads newest-first. Returns null (not throws) if the DB is unreachable. */
async function fetchLeads(): Promise<LeadRow[] | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, type, message, status, created_at, people ( name, email, company, attributes )"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as LeadRow[]) ?? [];
  } catch (err) {
    console.error("[admin] failed to load leads:", err);
    return null;
  }
}

export default async function AdminLeadsPage() {
  const leads = await fetchLeads();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <header className="mb-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--gray-2)]">
          Jasper AI · Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Leads
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          Every inquiry from the site, newest first.
        </p>
      </header>

      {leads === null || leads.length === 0 ? (
        <EmptyState connected={leads !== null} />
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--gray-2)]">
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </p>
          <LeadsTable leads={leads} />
        </>
      )}
    </main>
  );
}

function EmptyState({ connected }: { connected: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
      <p className="text-lg font-medium text-[var(--ink)]">
        No leads yet or database not connected
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        {connected
          ? "Once someone submits the contact form, their inquiry will appear here automatically."
          : "The database isn't reachable yet. Run the migration in Supabase and set the environment variables, then refresh."}
      </p>
    </div>
  );
}

function LeadsTable({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--rule)] text-xs uppercase tracking-wide text-[var(--gray-2)]">
            <th className="px-5 py-4 font-semibold">Person</th>
            <th className="px-5 py-4 font-semibold">Inquiry</th>
            <th className="px-5 py-4 font-semibold">Message</th>
            <th className="px-5 py-4 font-semibold">Details</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold whitespace-nowrap">
              Received
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const person = lead.people;
            const attrs = person?.attributes ?? {};
            return (
              <tr
                key={lead.id}
                className="border-b border-[var(--rule)] align-top last:border-b-0"
              >
                <td className="px-5 py-4">
                  <div className="font-medium text-[var(--ink)]">
                    {person?.name || "—"}
                  </div>
                  <a
                    href={person ? `mailto:${person.email}` : undefined}
                    className="font-mono text-xs text-[var(--blue)] hover:underline"
                  >
                    {person?.email || "—"}
                  </a>
                  {person?.company && (
                    <div className="mt-1 text-xs text-[var(--gray-2)]">
                      {person.company}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 text-[var(--ink)]">
                  {TYPE_LABELS[lead.type] ?? lead.type}
                </td>
                <td className="max-w-xs px-5 py-4 text-[var(--gray-2)]">
                  <p className="whitespace-pre-wrap break-words">
                    {lead.message || "—"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <dl className="space-y-1 text-xs text-[var(--gray-2)]">
                    <AttrRow label="Heard via" value={attrs.how_they_heard} />
                    <AttrRow label="Company size" value={attrs.company_size} />
                    <AttrRow label="Budget" value={attrs.estimated_budget} />
                  </dl>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-xs text-[var(--gray-2)]">
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttrRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5">
      <dt className="text-[var(--gray-1)]">{label}:</dt>
      <dd className="text-[var(--ink-soft)]">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-block rounded-full bg-[var(--blue-soft)] px-3 py-1 text-xs font-medium text-[var(--blue)]">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
