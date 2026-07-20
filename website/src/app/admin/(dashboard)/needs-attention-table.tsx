"use client";

/**
 * "Needs attention" table — open leads that have gone stale past their
 * per-stage threshold (new_lead > 2d, contacted > 4d, discovery_call/
 * proposal > 7d — see `computeStaleness` in `lib/pipeline.ts`). Every row is
 * workable IN PLACE: clicking it opens the same `LeadDrawer` used on
 * `/admin/leads`, where a status change, a note, or "mark followed up" all
 * write one activity_log row via the existing server actions — no
 * navigating away from the dashboard.
 *
 * A client component (unlike the rest of the server-rendered dashboard)
 * because it owns drawer-open state and calls server actions, exactly like
 * `leads-board.tsx` on the Leads page — this is the same optimistic-update
 * pattern, just scoped to the stale subset.
 */
import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from "lucide-react";
import {
  updateLeadStatus,
  addLeadNote,
  markLeadFollowedUp,
} from "@/app/actions/leads";
import {
  STATUS_LABELS,
  TYPE_LABELS,
  type ActivityLogRow,
  type LeadRow,
  type Status,
} from "@/lib/leads";
import type { NeedsAttentionRow } from "@/lib/dashboard";
import { Card } from "./dashboard-widgets";
import { LeadDrawer } from "./lead-drawer";
import { PAGE_SIZE } from "./pagination";

// Same compact control styling as `list-toolbar.tsx`'s `ListToolbar` — reused
// verbatim so this section's search input matches the rest of the admin UI.
// Unlike `ListToolbar` (URL/server-driven, for full pages), this table's data
// is already fetched in full and bounded (stale leads only), so search/sort/
// pagination are plain local React state — no router, no round-trip.
const controlBase =
  "h-9 rounded-[10px] border border-[var(--rule)] bg-[var(--paper)] text-sm text-[var(--ink)] " +
  "outline-none transition-[border-color,box-shadow] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-soft)]";

// Identical chevron treatment to `list-toolbar.tsx`'s filter `<select>` — kept
// local for the same reason `controlBase` is: this table doesn't pull in the
// heavier shared form styles.
const chevron =
  "appearance-none bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.8rem] " +
  "bg-[image:url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2386868b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]";

// Stages that can actually appear in this table: needs-attention only ever
// flags OPEN leads that can go stale (see `computeStaleness` in
// `lib/pipeline.ts`) — won/lost are excluded there, so the filter shouldn't
// offer them either.
const STAGE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All stages" },
  { value: "new_lead", label: STATUS_LABELS.new_lead },
  { value: "contacted", label: STATUS_LABELS.contacted },
  { value: "discovery_call", label: STATUS_LABELS.discovery_call },
  { value: "proposal", label: STATUS_LABELS.proposal },
];

type SortKey = "name" | "type" | "stage" | "idle";
type SortDirection = "asc" | "desc";

export function NeedsAttentionTable({
  rows: initialRows,
  leads,
  activity: initialActivity,
}: {
  rows: NeedsAttentionRow[];
  /** Full lead rows for every contact in `rows` — from `lib/dashboard.ts`'s
   * `needsAttentionLeads`, so the drawer has everything it needs without a
   * second fetch. */
  leads: LeadRow[];
  activity: ActivityLogRow[];
}) {
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());
  const [activity, setActivity] = useState<ActivityLogRow[]>(initialActivity);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Search / sort / pagination — all client-side over the already-fetched
  // stale-lead list (bounded data volume, not a large table), kept separate
  // from `handledIds` so an in-place action never fights these view concerns.
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("idle");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const rows = initialRows.filter((r) => !handledIds.has(r.id));
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const openLead = openId ? leadById.get(openId) ?? null : null;

  const subtitle =
    rows.length === 0
      ? "Open leads past their stage's staleness threshold — oldest first"
      : `${rows.length} open lead${rows.length === 1 ? "" : "s"} past their stage's staleness threshold — oldest first`;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (stageFilter !== "all" && r.status !== stageFilter) return false;
      if (!q) return true;
      const typeLabel = (TYPE_LABELS[r.type] ?? r.type).toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        typeLabel.includes(q)
      );
    });
    // `rows` is a fresh array each render (derived from `initialRows` +
    // `handledIds`), so it's included as a dep even though its identity
    // changes every render — cheap for this bounded, stale-lead-only list.
  }, [rows, search, stageFilter]);

  const sortedRows = useMemo(() => {
    const compare = (a: NeedsAttentionRow, b: NeedsAttentionRow) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "type":
          return (TYPE_LABELS[a.type] ?? a.type).localeCompare(TYPE_LABELS[b.type] ?? b.type);
        case "stage":
          return a.statusLabel.localeCompare(b.statusLabel);
        case "idle":
        default:
          return a.idleDays - b.idleDays;
      }
    };
    const sorted = [...filteredRows].sort(compare);
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredRows, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = sortedRows.slice(pageStart, pageStart + PAGE_SIZE);
  const pageFrom = sortedRows.length === 0 ? 0 : pageStart + 1;
  const pageTo = Math.min(pageStart + PAGE_SIZE, sortedRows.length);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1); // never strand the user on a now-empty page
  }

  function handleStageFilterChange(value: string) {
    setStageFilter(value);
    setPage(1); // never strand the user on a now-empty page
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  }

  function markHandled(id: string) {
    setHandledIds((prev) => new Set(prev).add(id));
    setPage(1); // a row leaving the list never strands the user on an empty page
  }

  function appendActivity(entry: ActivityLogRow) {
    setActivity((prev) => [...prev, entry]);
  }

  function removeActivity(id: string) {
    setActivity((prev) => prev.filter((a) => a.id !== id));
  }

  function handleMoveStage(status: Status, note: string) {
    if (!openLead || status === openLead.status) return;
    const fromStatus = openLead.status;
    const trimmedNote = note.trim();
    const optimisticEntry: ActivityLogRow = {
      id: `optimistic-${Date.now()}`,
      contact_id: openLead.id,
      from_status: fromStatus,
      to_status: status,
      actor: "admin",
      note: trimmedNote || null,
      created_at: new Date().toISOString(),
    };
    appendActivity(optimisticEntry);
    markHandled(openLead.id);
    setError(null);

    startTransition(async () => {
      const result = await updateLeadStatus(openLead.id, status, trimmedNote || undefined);
      if (!result.success) {
        removeActivity(optimisticEntry.id);
        setHandledIds((prev) => {
          const next = new Set(prev);
          next.delete(openLead.id);
          return next;
        });
        setError(result.error ?? "Couldn't move this lead.");
      }
    });
  }

  function logNote(
    note: string,
    action: (id: string, n: string) => Promise<{ success: boolean; error?: string }>
  ) {
    if (!openLead) return;
    const optimisticEntry: ActivityLogRow = {
      id: `optimistic-${Date.now()}`,
      contact_id: openLead.id,
      from_status: openLead.status,
      to_status: openLead.status,
      actor: "admin",
      note,
      created_at: new Date().toISOString(),
    };
    appendActivity(optimisticEntry);
    markHandled(openLead.id);
    setError(null);

    startTransition(async () => {
      const result = await action(openLead.id, note);
      if (!result.success) {
        removeActivity(optimisticEntry.id);
        setHandledIds((prev) => {
          const next = new Set(prev);
          next.delete(openLead.id);
          return next;
        });
        setError(result.error ?? "Couldn't save that.");
      }
    });
  }

  return (
    <Card title="Needs attention" subtitle={subtitle}>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--gray-2)]">
          Nothing stale — every open lead is within its stage&apos;s threshold.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                size={15}
                strokeWidth={2}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-3)]"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, email, or type…"
                aria-label="Search by name, email, or type"
                className={`${controlBase} w-full pl-9 pr-3 placeholder:text-[var(--gray-3)] sm:w-[300px]`}
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => handleStageFilterChange(e.target.value)}
              aria-label="Filter by stage"
              className={`${controlBase} ${chevron} cursor-pointer pl-3.5 pr-9 hover:border-[var(--gray-3)]`}
            >
              {STAGE_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {filteredRows.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-[var(--gray-2)]">
              No leads match your search.
            </p>
          ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--rule)] text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-1)]">
                <SortableHeader label="Person" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Type" sortKey="type" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Stage" sortKey="stage" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                <SortableHeader label="Idle" sortKey="idle" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => {
                const overdueBy = row.idleDays - row.thresholdDays;
                const critical = overdueBy >= row.thresholdDays;
                const idleColor = critical ? "var(--red)" : "var(--amber)";
                const idleBg = critical ? "var(--red-soft)" : "var(--amber-soft)";
                return (
                  <tr key={row.id} className="border-b border-[var(--rule)] last:border-0">
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => setOpenId(row.id)}
                        className="block max-w-[240px] text-left"
                      >
                        <span className="block truncate text-[14px] font-medium text-[var(--ink)] hover:text-[var(--blue)]">
                          {row.name}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--gray-1)]">
                          {row.email}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-[13px] text-[var(--ink)]">
                      {TYPE_LABELS[row.type] ?? row.type}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink)]">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: row.statusColor }}
                        />
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
                        style={{ color: idleColor, background: idleBg }}
                        title={`Threshold for this stage: ${row.thresholdDays}d`}
                      >
                        {row.idleDays}d
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          )}

          <NeedsAttentionPagination
            page={currentPage}
            totalPages={totalPages}
            from={pageFrom}
            to={pageTo}
            total={sortedRows.length}
            onPageChange={setPage}
          />
        </>
      )}

      <LeadDrawer
        isOpen={openId !== null}
        lead={openLead}
        activity={
          openLead ? activity.filter((a) => a.contact_id === openLead.id) : []
        }
        otherContacts={[]}
        onClose={() => setOpenId(null)}
        onSelectContact={() => {}}
        onMoveStage={handleMoveStage}
        onAddNote={(note) => logNote(note.trim(), addLeadNote)}
        onMarkFollowedUp={(note) =>
          logNote(note.trim() || "Marked as followed up", markLeadFollowedUp)
        }
      />
    </Card>
  );
}

/** A `<th>` whose click toggles sort on `sortKey`, with a chevron indicating
 * the active column's direction — same interaction pattern as any sortable
 * table, styled to match the existing header row exactly (no new tokens). */
function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = sortKey === activeKey;
  const Icon = direction === "asc" ? ChevronUp : ChevronDown;
  return (
    <th className={`py-2.5 pr-4 ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "flex-row-reverse" : ""
        } text-[11px] font-semibold uppercase tracking-wider ${
          isActive ? "text-[var(--ink)]" : "text-[var(--gray-1)]"
        } hover:text-[var(--ink)]`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive && <Icon size={12} strokeWidth={2.5} aria-hidden />}
      </button>
    </th>
  );
}

/** Client-side equivalent of `pagination.tsx`'s `Pagination` — same visual
 * treatment ("Showing X–Y of Z" + Prev/Next), but Prev/Next are plain buttons
 * calling `onPageChange` (local state) instead of `Link`s writing `?page=`,
 * since this section's data is already fetched in full, not URL-driven. */
function NeedsAttentionPagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const base =
    "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition";
  const enabled = "border-[var(--rule)] text-[var(--ink)] hover:border-[var(--blue)] hover:text-[var(--blue)]";
  const disabled = "cursor-not-allowed border-[var(--rule)] text-[var(--gray-1)] opacity-50";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[var(--gray-2)]">
        {total === 0 ? (
          "No results"
        ) : (
          <>
            Showing{" "}
            <span className="font-medium text-[var(--ink)]">
              {from}–{to}
            </span>{" "}
            of <span className="font-medium text-[var(--ink)]">{total}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className={`${base} ${page <= 1 ? disabled : enabled}`}
        >
          <ChevronLeft size={15} />
          Prev
        </button>
        <span className="px-2 text-xs text-[var(--gray-2)]">
          Page <span className="font-medium text-[var(--ink)]">{page}</span> of{" "}
          {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className={`${base} ${page >= totalPages ? disabled : enabled}`}
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
