"use client";

import { useMemo, useState, useTransition } from "react";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
  isStale,
  timeAgo,
  type ActivityLogRow,
  type LeadRow,
  type Status,
} from "@/lib/leads";
import { updateLeadStatus } from "@/app/actions/leads";
import { LeadDrawer } from "./lead-drawer";

export function LeadsBoard({
  leads: initialLeads,
  activity: initialActivity,
}: {
  leads: LeadRow[];
  activity: ActivityLogRow[];
}) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activity, setActivity] = useState<ActivityLogRow[]>(initialActivity);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cachedLead, setCachedLead] = useState<LeadRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isOpen = openId !== null;
  const currentLead = openId ? leads.find((l) => l.id === openId) ?? null : null;

  // Keep the drawer's content around across the close animation instead of
  // unmounting it — same as the static prototype, whose drawer never clears
  // its innerHTML on close, so the panel doesn't flash empty mid-slide. This
  // is React's documented "adjust state during render" pattern (compute and
  // setState in the render body, gated on a change, rather than in a
  // useEffect) — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevCurrentLead, setPrevCurrentLead] = useState(currentLead);
  if (currentLead !== prevCurrentLead) {
    setPrevCurrentLead(currentLead);
    if (currentLead) setCachedLead(currentLead);
  }

  const columns = useMemo(() => {
    const grouped: Record<Status, LeadRow[]> = {
      new_lead: [],
      contacted: [],
      discovery_call: [],
      proposal: [],
      won: [],
      lost: [],
    };
    for (const lead of leads) {
      const status = (lead.status as Status) in grouped ? (lead.status as Status) : null;
      if (status) grouped[status].push(lead);
    }
    for (const status of STATUS_ORDER) {
      grouped[status].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      );
    }
    return grouped;
  }, [leads]);

  const activityByContact = useMemo(() => {
    const map: Record<string, ActivityLogRow[]> = {};
    for (const row of activity) {
      (map[row.contact_id] ??= []).push(row);
    }
    for (const id in map) {
      map[id].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    }
    return map;
  }, [activity]);

  const contactsByPerson = useMemo(() => {
    const map: Record<string, LeadRow[]> = {};
    for (const lead of leads) {
      (map[lead.person_id] ??= []).push(lead);
    }
    for (const id in map) {
      map[id].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    }
    return map;
  }, [leads]);

  function moveLead(contactId: string, newStatus: Status, note: string) {
    const lead = leads.find((l) => l.id === contactId);
    if (!lead || lead.status === newStatus) return;

    const fromStatus = lead.status;
    const trimmedNote = note.trim();

    setLeads((prev) =>
      prev.map((l) => (l.id === contactId ? { ...l, status: newStatus } : l))
    );

    const optimisticEntry: ActivityLogRow = {
      id: `optimistic-${Date.now()}`,
      contact_id: contactId,
      from_status: fromStatus,
      to_status: newStatus,
      actor: "admin",
      note: trimmedNote || null,
      created_at: new Date().toISOString(),
    };
    setActivity((prev) => [...prev, optimisticEntry]);
    setError(null);

    startTransition(async () => {
      const result = await updateLeadStatus(
        contactId,
        newStatus,
        trimmedNote || undefined
      );

      if (!result.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === contactId ? { ...l, status: fromStatus } : l))
        );
        setActivity((prev) => prev.filter((a) => a.id !== optimisticEntry.id));
        setError(result.error ?? "Couldn't move this lead.");
      }
    });
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            leads={columns[status]}
            activityByContact={activityByContact}
            onOpen={setOpenId}
          />
        ))}
      </div>

      <LeadDrawer
        isOpen={isOpen}
        lead={cachedLead}
        activity={cachedLead ? activityByContact[cachedLead.id] ?? [] : []}
        otherContacts={
          cachedLead
            ? (contactsByPerson[cachedLead.person_id] ?? []).filter(
                (l) => l.id !== cachedLead.id
              )
            : []
        }
        onClose={() => setOpenId(null)}
        onSelectContact={(id) => setOpenId(id)}
        onMoveStage={(status, note) => {
          if (cachedLead) moveLead(cachedLead.id, status, note);
        }}
      />
    </div>
  );
}

function Column({
  status,
  leads,
  activityByContact,
  onOpen,
}: {
  status: Status;
  leads: LeadRow[];
  activityByContact: Record<string, ActivityLogRow[]>;
  onOpen: (contactId: string) => void;
}) {
  return (
    <div className="flex w-[248px] shrink-0 flex-col">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold text-[var(--ink)]">
          {STATUS_LABELS[status]}
        </h2>
        <span className="rounded-full bg-[var(--rule)] px-2 py-0.5 text-[11px] font-medium text-[var(--gray-2)]">
          {leads.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {leads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--rule)] px-3 py-5 text-center text-[11px] text-[var(--gray-2)]">
            No inquiries
          </p>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stale={isStale(lead, activityByContact[lead.id] ?? [])}
              onOpen={() => onOpen(lead.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  stale,
  onOpen,
}: {
  lead: LeadRow;
  stale: boolean;
  onOpen: () => void;
}) {
  const person = lead.people;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`rounded-xl border border-[var(--rule)] bg-[var(--paper)] p-3 text-left transition hover:border-[var(--gray-3)] hover:shadow-sm ${
        stale ? "shadow-[inset_3px_0_0_0_var(--amber)]" : ""
      }`}
    >
      <p className="truncate text-sm font-semibold text-[var(--ink)]">
        {person?.name || "—"}
      </p>
      <p className="mt-0.5 truncate text-xs text-[var(--gray-2)]">
        {person?.company || person?.email || "—"}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">
          {TYPE_LABELS[lead.type] ?? lead.type}
        </span>
        <span className="shrink-0 text-[11px] text-[var(--gray-1)]">
          {timeAgo(lead.created_at)}
        </span>
      </div>
      {stale && (
        <p className="mt-2 text-[11px] font-semibold text-[var(--amber)]">
          ⏳ Needs follow-up
        </p>
      )}
    </button>
  );
}
