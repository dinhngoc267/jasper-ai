"use client";

import { useMemo, useState, useTransition } from "react";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
  timeAgo,
  type ActivityLogRow,
  type LeadRow,
  type Status,
} from "@/lib/leads";
import {
  updateLeadStatus,
  addLeadNote,
  markLeadFollowedUp,
} from "@/app/actions/leads";
import { LeadDrawer } from "./lead-drawer";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new_lead", label: "New" },
  { key: "active", label: "Active" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const ACTIVE_SET: Status[] = ["contacted", "discovery_call", "proposal"];

export function LeadsBoard({
  leads: initialLeads,
  activity: initialActivity,
  initialOpenId = null,
}: {
  leads: LeadRow[];
  activity: ActivityLogRow[];
  /** Optionally open a lead's drawer on mount — used by the dashboard's
   * "needs attention" table, which deep-links here via `?lead=<contactId>`. */
  initialOpenId?: string | null;
}) {
  // A valid deep-linked lead (`?lead=<id>`) opens its drawer on mount. We seed
  // both `openId` AND `cachedLead` from it: the cache-setting branch below only
  // runs on a *change*, so without seeding cachedLead the drawer would open
  // blank on the very first render.
  const deepLinkedLead =
    (initialOpenId && initialLeads.find((l) => l.id === initialOpenId)) || null;

  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activity, setActivity] = useState<ActivityLogRow[]>(initialActivity);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(
    deepLinkedLead ? deepLinkedLead.id : null
  );
  const [cachedLead, setCachedLead] = useState<LeadRow | null>(deepLinkedLead);
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

  const filtered = useMemo(() => {
    const matchesFilter = (lead: LeadRow) => {
      if (filter === "all") return true;
      if (filter === "active") return ACTIVE_SET.includes(lead.status as Status);
      return lead.status === filter;
    };
    return [...leads]
      .filter(matchesFilter)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [leads, filter]);

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

  /** Shared optimistic path for the two note-only actions (add note / mark
   * followed up) — both write one activity_log row with from_status ===
   * to_status, so the lead's stage never changes but its staleness clock
   * resets. */
  function logNote(
    contactId: string,
    note: string,
    action: (id: string, n: string) => Promise<{ success: boolean; error?: string }>
  ) {
    const lead = leads.find((l) => l.id === contactId);
    if (!lead) return;

    const optimisticEntry: ActivityLogRow = {
      id: `optimistic-${Date.now()}`,
      contact_id: contactId,
      from_status: lead.status,
      to_status: lead.status,
      actor: "admin",
      note,
      created_at: new Date().toISOString(),
    };
    setActivity((prev) => [...prev, optimisticEntry]);
    setError(null);

    startTransition(async () => {
      const result = await action(contactId, note);
      if (!result.success) {
        setActivity((prev) => prev.filter((a) => a.id !== optimisticEntry.id));
        setError(result.error ?? "Couldn't save that.");
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

      <div className="mb-[18px] flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-[15px] py-[7px] text-[13px] font-medium transition ${
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--gray-3)]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden overflow-x-auto rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--rule)] text-[11.5px] font-semibold tracking-wider text-[var(--gray-1)] uppercase">
              <th className="px-[22px] py-[13px]">Name</th>
              <th className="px-[22px] py-[13px]">Type</th>
              <th className="px-[22px] py-[13px]">Received</th>
              <th className="px-[22px] py-[13px]">Budget</th>
              <th className="px-[22px] py-[13px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-[22px] py-10 text-center text-[var(--gray-2)]">
                  No leads in this view.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const person = lead.people;
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-[var(--rule)] last:border-0"
                  >
                    <td className="px-[22px] py-3.5 align-middle">
                      <button
                        type="button"
                        onClick={() => setOpenId(lead.id)}
                        className="block max-w-[240px] text-left"
                      >
                        <span className="block truncate text-[14.5px] font-medium text-[var(--ink)]">
                          {person?.name || "—"}
                        </span>
                        <span className="block truncate text-[12.5px] text-[var(--gray-1)]">
                          {person?.company || person?.email || "—"}
                        </span>
                      </button>
                    </td>
                    <td className="px-[22px] py-3.5 align-middle text-[13px] text-[var(--ink)]">
                      {TYPE_LABELS[lead.type] ?? lead.type}
                    </td>
                    <td className="px-[22px] py-3.5 align-middle text-[13px] text-[var(--gray-2)]">
                      {timeAgo(lead.created_at)}
                    </td>
                    <td className="px-[22px] py-3.5 align-middle text-[13px] text-[var(--gray-2)]">
                      {person?.attributes?.estimated_budget || "—"}
                    </td>
                    <td className="px-[22px] py-3.5 align-middle">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: STATUS_COLORS[lead.status] }}
                        />
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            moveLead(lead.id, e.target.value as Status, "")
                          }
                          className="cursor-pointer appearance-none rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-2 py-1.5 text-[12.5px] font-medium text-[var(--ink)]"
                        >
                          {STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
        onAddNote={(note) => {
          if (cachedLead) logNote(cachedLead.id, note.trim(), addLeadNote);
        }}
        onMarkFollowedUp={(note) => {
          if (cachedLead)
            logNote(
              cachedLead.id,
              note.trim() || "Marked as followed up",
              markLeadFollowedUp
            );
        }}
      />
    </div>
  );
}
