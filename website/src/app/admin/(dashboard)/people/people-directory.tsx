"use client";

import { useMemo, useRef, useState } from "react";
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
  type PersonContactRow,
  type PersonOrderRow,
  type PersonRow,
} from "@/lib/people";
import {
  formatAmount,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
} from "@/lib/orders";
import { getPersonDetail, type PersonDetail } from "@/app/actions/person-detail";
import { Section, KVGrid } from "../kv";

/**
 * Renders one server-fetched page of people (search / filter / pagination live
 * in `people/page.tsx` via URL params). Clicking a row opens a drawer whose
 * inquiries / status history / orders are fetched ON DEMAND for that single
 * person via the `getPersonDetail` server action — so the list page never bulk-
 * loads the contacts / activity_log / orders tables.
 */
export function PeopleDirectory({ people }: { people: PersonRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  // Guards against a slow earlier request landing after a newer one — only the
  // most recently opened person's data is applied.
  const requestedId = useRef<string | null>(null);

  const openPerson = openId ? people.find((p) => p.id === openId) ?? null : null;

  function open(person: PersonRow) {
    requestedId.current = person.id;
    setOpenId(person.id);
    setDetail(null);
    setLoading(true);
    getPersonDetail(person.id)
      .then((d) => {
        if (requestedId.current !== person.id) return;
        setDetail(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[people] failed to load person detail:", err);
        if (requestedId.current !== person.id) return;
        setDetail({ contacts: [], activity: [], orders: [] });
        setLoading(false);
      });
  }

  function close() {
    requestedId.current = null;
    setOpenId(null);
  }

  return (
    <div>
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
            {people.map((person) => (
              <tr
                key={person.id}
                onClick={() => open(person)}
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
            ))}
          </tbody>
        </table>
      </div>

      <PersonDrawer
        isOpen={openPerson !== null}
        person={openPerson}
        detail={detail}
        loading={loading}
        onClose={close}
      />
    </div>
  );
}

function PersonDrawer({
  isOpen,
  person,
  detail,
  loading,
  onClose,
}: {
  isOpen: boolean;
  person: PersonRow | null;
  detail: PersonDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const attrs = person?.attributes ?? {};
  const contacts = detail?.contacts ?? [];
  const orders = detail?.orders ?? [];

  // Group this person's status-change history by the contact it belongs to.
  const activityByContact = useMemo(() => {
    const map: Record<string, ActivityLogRow[]> = {};
    for (const row of detail?.activity ?? []) {
      (map[row.contact_id] ??= []).push(row);
    }
    return map;
  }, [detail]);

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
        aria-label={
          person?.name ? `${person.name} — person details` : "Person details"
        }
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
                    [
                      "Newsletter",
                      person.ok_to_contact ? "Opted in" : "Opted out",
                    ],
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

              {loading ? (
                <DrawerLoading />
              ) : (
                <>
                  <Section title={`Inquiries (${contacts.length})`}>
                    {contacts.length === 0 ? (
                      <p className="text-xs text-[var(--gray-2)]">
                        No inquiries yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {contacts.map((contact) => (
                          <InquiryCard
                            key={contact.id}
                            contact={contact}
                            activity={activityByContact[contact.id] ?? []}
                          />
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section title={`Orders (${orders.length})`}>
                    {orders.length === 0 ? (
                      <p className="text-xs text-[var(--gray-2)]">
                        No orders yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {orders.map((order) => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                    )}
                  </Section>
                </>
              )}

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

function InquiryCard({
  contact,
  activity,
}: {
  contact: PersonContactRow;
  activity: ActivityLogRow[];
}) {
  return (
    <div className="rounded-lg border border-[var(--rule)] px-3 py-2.5">
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
      {activity.length > 0 && (
        <ul className="mt-2 space-y-1 border-l border-[var(--rule)] pl-2.5">
          {activity.map((a) => (
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
  );
}

function OrderCard({ order }: { order: PersonOrderRow }) {
  const style = ORDER_STATUS_STYLES[order.status];
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--rule)] px-3 py-2.5">
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
}

/** Small pulsing placeholder shown in the drawer while a person's related data
 * (inquiries + orders) is fetched on demand. */
function DrawerLoading() {
  return (
    <div className="mb-6 animate-pulse space-y-3 motion-reduce:animate-none">
      <div className="h-3 w-24 rounded bg-[var(--cream)]" />
      <div className="h-14 rounded-lg bg-[var(--cream)]" />
      <div className="h-14 rounded-lg bg-[var(--cream)]" />
    </div>
  );
}
