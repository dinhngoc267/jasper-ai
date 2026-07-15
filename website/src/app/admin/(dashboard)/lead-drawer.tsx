"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
  formatDate,
  initials,
  subjectOrFallback,
  timeAgo,
  type ActivityLogRow,
  type LeadRow,
  type Status,
} from "@/lib/leads";
import { fieldClass } from "@/lib/ui";
import { Section, KVGrid } from "./kv";

export function LeadDrawer({
  isOpen,
  lead,
  activity,
  otherContacts,
  onClose,
  onSelectContact,
  onMoveStage,
}: {
  isOpen: boolean;
  /** The last-opened lead. Kept non-null across the close animation (like
   * the prototype's drawer, which never clears its innerHTML on close) so
   * the panel doesn't flash empty while it slides away. */
  lead: LeadRow | null;
  activity: ActivityLogRow[];
  otherContacts: LeadRow[];
  onClose: () => void;
  onSelectContact: (contactId: string) => void;
  onMoveStage: (status: Status, note: string) => void;
}) {
  const [note, setNote] = useState("");

  // Fresh note field every time the drawer opens on a (possibly different)
  // lead — mirrors the prototype re-rendering the textarea from scratch.
  // Adjust-state-during-render pattern (see leads-board.tsx for the same
  // idiom) instead of a useEffect that calls setState.
  const [prevLeadId, setPrevLeadId] = useState(lead?.id);
  if (lead?.id !== prevLeadId) {
    setPrevLeadId(lead?.id);
    setNote("");
  }

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const person = lead?.people ?? null;
  const attrs = person?.attributes ?? {};

  function handleStageClick(status: Status) {
    if (!lead || status === lead.status) return;
    onMoveStage(status, note);
    setNote("");
  }

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
        aria-label={person?.name ? `${person.name} — lead details` : "Lead details"}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-[var(--paper)] shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {lead && (
          <>
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ink)] text-sm font-semibold text-white">
                  {initials(person?.name)}
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                    {person?.name || "—"}
                  </h3>
                  <p className="text-xs text-[var(--gray-2)]">
                    {[person?.company, person?.email].filter(Boolean).join(" · ")}
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
              <Section title="Stage">
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_ORDER.map((status) => {
                    const isCurrent = status === lead.status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStageClick(status)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isCurrent
                            ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                            : "border-[var(--gray-3)] bg-[var(--paper)] text-[var(--gray-2)] hover:border-[var(--blue)] hover:text-[var(--blue)]"
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note about this change — added automatically if you click a stage above"
                  className={`${fieldClass} mt-2.5 min-h-[52px] resize-y px-3 py-2 text-xs`}
                />
              </Section>

              <Section title="Inquiry">
                <KVGrid
                  rows={[
                    [
                      "Type",
                      <span
                        key="type"
                        className="rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--blue)]"
                      >
                        {TYPE_LABELS[lead.type] ?? lead.type}
                      </span>,
                    ],
                    ["Subject", subjectOrFallback(lead)],
                    ["Source", lead.source || "—"],
                    ["Received", timeAgo(lead.created_at)],
                  ]}
                />
                <div className="mt-3 rounded-lg bg-[var(--cream)]/40 p-3 text-sm text-[var(--ink)]">
                  {lead.message || "(no message)"}
                </div>
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

              <Section title="Activity">
                {activity.length === 0 ? (
                  <p className="text-xs text-[var(--gray-2)]">
                    No status changes yet
                  </p>
                ) : (
                  <ul className="space-y-3 border-l border-[var(--rule)] pl-3">
                    {activity.map((a) => (
                      <li key={a.id} className="text-xs">
                        <p className="text-[var(--ink)]">
                          <strong>
                            {a.from_status ? STATUS_LABELS[a.from_status] ?? a.from_status : "—"}
                          </strong>{" "}
                          →{" "}
                          <strong>{STATUS_LABELS[a.to_status] ?? a.to_status}</strong>
                          {a.actor ? ` · ${a.actor}` : ""}
                        </p>
                        {a.note && (
                          <p className="mt-0.5 text-[var(--gray-2)]">
                            &ldquo;{a.note}&rdquo;
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-[var(--gray-1)]">
                          {timeAgo(a.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {otherContacts.length > 0 && (
                <Section title="Other inquiries from this person">
                  <div className="space-y-2">
                    {otherContacts.map((other) => (
                      <button
                        key={other.id}
                        type="button"
                        onClick={() => onSelectContact(other.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--rule)] px-3 py-2.5 text-left transition hover:border-[var(--gray-3)] hover:bg-[var(--cream)]/30"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                            {subjectOrFallback(other)}
                          </span>
                          <span className="block text-[11px] text-[var(--gray-2)]">
                            {TYPE_LABELS[other.type] ?? other.type} ·{" "}
                            {timeAgo(other.created_at)}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">
                          {STATUS_LABELS[other.status] ?? other.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              <p className="text-[11px] text-[var(--gray-1)]" title={formatDate(lead.created_at)}>
                First received {formatDate(lead.created_at)}
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
