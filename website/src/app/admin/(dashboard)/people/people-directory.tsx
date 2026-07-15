"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_LABELS,
  formatDate,
  initials,
  subjectOrFallback,
  timeAgo,
  type ActivityLogRow,
} from "@/lib/leads";
import {
  matchesSearch,
  type PersonContactRow,
  type PersonOrderRow,
  type PersonRow,
} from "@/lib/people";
import {
  formatAmount,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
} from "@/lib/orders";
import { fieldClass } from "@/lib/ui";
import { Section, KVGrid } from "../kv";

export function PeopleDirectory({
  people,
  contacts,
  activity,
  orders,
}: {
  people: PersonRow[];
  contacts: PersonContactRow[];
  activity: ActivityLogRow[];
  orders: PersonOrderRow[];
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () => people.filter((person) => matchesSearch(person, query)),
    [people, query]
  );

  const contactsByPerson = useMemo(() => {
    const map: Record<string, PersonContactRow[]> = {};
    for (const contact of contacts) {
      (map[contact.person_id] ??= []).push(contact);
    }
    return map;
  }, [contacts]);

  const activityByContact = useMemo(() => {
    const map: Record<string, ActivityLogRow[]> = {};
    for (const row of activity) {
      (map[row.contact_id] ??= []).push(row);
    }
    return map;
  }, [activity]);

  const ordersByPerson = useMemo(() => {
    const map: Record<string, PersonOrderRow[]> = {};
    for (const order of orders) {
      (map[order.person_id] ??= []).push(order);
    }
    return map;
  }, [orders]);

  const openPerson = openId ? people.find((p) => p.id === openId) ?? null : null;

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or company…"
          className={`${fieldClass} max-w-sm`}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--rule)] text-xs uppercase tracking-wider text-[var(--gray-2)]">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">How they heard</th>
              <th className="px-4 py-3 font-semibold">Company size</th>
              <th className="px-4 py-3 font-semibold">Budget</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[var(--gray-2)]"
                >
                  No people match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            ) : (
              filtered.map((person) => (
                <tr
                  key={person.id}
                  onClick={() => setOpenId(person.id)}
                  className="cursor-pointer border-b border-[var(--rule)] transition last:border-0 hover:bg-[var(--cream)]/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--ink-soft)] text-[13px] font-semibold text-white">
                        {initials(person.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ink)]">
                          {person.name || "—"}
                        </p>
                        <p className="truncate text-xs text-[var(--gray-2)]">
                          {person.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">
                    {person.company || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--gray-2)]">
                    {person.attributes?.how_they_heard || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--gray-2)]">
                    {person.attributes?.company_size || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--gray-2)]">
                    {person.attributes?.estimated_budget || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PersonDrawer
        isOpen={openPerson !== null}
        person={openPerson}
        contacts={openPerson ? contactsByPerson[openPerson.id] ?? [] : []}
        activityByContact={activityByContact}
        orders={openPerson ? ordersByPerson[openPerson.id] ?? [] : []}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

function PersonDrawer({
  isOpen,
  person,
  contacts,
  activityByContact,
  orders,
  onClose,
}: {
  isOpen: boolean;
  person: PersonRow | null;
  contacts: PersonContactRow[];
  activityByContact: Record<string, ActivityLogRow[]>;
  orders: PersonOrderRow[];
  onClose: () => void;
}) {
  const attrs = person?.attributes ?? {};

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[var(--ink)]/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={person?.name ? `${person.name} — person details` : "Person details"}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-[var(--paper)] shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {person && (
          <>
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ink)] text-sm font-semibold text-white">
                  {initials(person.name)}
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                    {person.name || "—"}
                  </h3>
                  <p className="text-xs text-[var(--gray-2)]">
                    {[person.company, person.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[var(--gray-2)] transition hover:bg-[var(--cream)] hover:text-[var(--ink)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <Section title="Contact">
                <KVGrid
                  rows={[
                    ["Phone", person.phone || "—"],
                    ["Role", person.role || "—"],
                    ["Source", person.source_site || "—"],
                    ["Newsletter", person.ok_to_contact ? "Opted in" : "Opted out"],
                  ]}
                />
              </Section>

              <Section title="Attributes">
                <KVGrid
                  rows={[
                    ["How they heard", attrs.how_they_heard || "—"],
                    ["Company size", attrs.company_size || "—"],
                    ["Budget", attrs.estimated_budget || "—"],
                  ]}
                />
              </Section>

              <Section title={`Inquiries (${contacts.length})`}>
                {contacts.length === 0 ? (
                  <p className="text-xs text-[var(--gray-2)]">No inquiries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="rounded-lg border border-[var(--rule)] px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--ink)]">
                            {subjectOrFallback(contact)}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
                            <span
                              className="h-[7px] w-[7px] rounded-full"
                              style={{ background: STATUS_COLORS[contact.status] }}
                            />
                            {STATUS_LABELS[contact.status] ?? contact.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--gray-2)]">
                          {TYPE_LABELS[contact.type] ?? contact.type} ·{" "}
                          {timeAgo(contact.created_at)}
                        </p>
                        {(activityByContact[contact.id] ?? []).length > 0 && (
                          <ul className="mt-2 space-y-1 border-l border-[var(--rule)] pl-2.5">
                            {activityByContact[contact.id].map((a) => (
                              <li key={a.id} className="text-[11px] text-[var(--gray-2)]">
                                {a.from_status
                                  ? STATUS_LABELS[a.from_status] ?? a.from_status
                                  : "—"}{" "}
                                → {STATUS_LABELS[a.to_status] ?? a.to_status} ·{" "}
                                {timeAgo(a.created_at)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={`Orders (${orders.length})`}>
                {orders.length === 0 ? (
                  <p className="text-xs text-[var(--gray-2)]">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map((order) => {
                      const style = ORDER_STATUS_STYLES[order.status];
                      return (
                        <div
                          key={order.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--rule)] px-3 py-2.5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                              {order.product_name}
                            </span>
                            <span className="block text-[11px] text-[var(--gray-2)]">
                              {formatAmount(order.amount_cents, order.currency)} ·{" "}
                              {timeAgo(order.created_at)}
                            </span>
                          </span>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: style?.bg, color: style?.color }}
                          >
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>

              <p
                className="text-[11px] text-[var(--gray-1)]"
                title={formatDate(person.created_at)}
              >
                Person since {formatDate(person.created_at)}
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
