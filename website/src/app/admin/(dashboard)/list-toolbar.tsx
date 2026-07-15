"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";

// A slim chevron for the filter <select> (appearance-none hides the native one,
// which looks inconsistent across browsers). Kept local to the toolbar so the
// heavier shared form styles (`fieldClass`/`selectClass`) aren't pulled in here.
const chevron =
  "appearance-none bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.8rem] " +
  "bg-[image:url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2386868b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]";

// Compact, toolbar-weight controls (h-9, subtle border, tokenized focus ring).
const controlBase =
  "h-9 rounded-[10px] border border-[var(--rule)] bg-[var(--paper)] text-sm text-[var(--ink)] " +
  "outline-none transition-[border-color,box-shadow] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-soft)]";

export type ToolbarOption = { value: string; label: string };

/**
 * Reusable search + filter toolbar for the admin list tabs. It owns no data —
 * it only writes `?q=` and the tab's filter param to the URL, so the page
 * stays a server component and re-fetches the matching page. Same URL-driven
 * pattern as `period-toggle.tsx`.
 *
 * - the free-text search is DEBOUNCED (~300ms) before it hits the router
 * - any change (search OR filter) RESETS `?page=` to 1, so narrowing the
 *   result set never strands you on a now-empty page
 * - `router.replace` (not push) keeps keystroke-level changes out of history,
 *   while the shareable/back-button URL still reflects the final state
 */
export function ListToolbar({
  searchPlaceholder,
  filterParam,
  filterLabel,
  options,
}: {
  searchPlaceholder: string;
  /** e.g. "status" | "heard" | "segment" — the filter's query-param name. */
  filterParam: string;
  filterLabel: string;
  /** Filter choices, "all" first. If only one is given the select is hidden. */
  options: ToolbarOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  // Keep the input in sync when the URL's `q` changes outside typing — e.g.
  // the browser back button, or a filter change that rebuilt the URL.
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  function commit(updates: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") sp.delete(key);
      else sp.set(key, value);
    }
    sp.delete("page"); // any search/filter change goes back to page 1
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // Debounce the free-text search before pushing it to the router.
  useEffect(() => {
    if (q === urlQ) return;
    const handle = setTimeout(() => commit({ q }), 300);
    return () => clearTimeout(handle);
    // `commit`/`searchParams` are read fresh on each keystroke render; only `q`
    // and `urlQ` should (re)arm the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, urlQ]);

  const currentFilter = searchParams.get(filterParam) ?? "all";

  return (
    <div
      className={`mb-5 flex flex-wrap items-center gap-2.5 transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <div className="relative">
        <Search
          size={15}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-3)]"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={`${controlBase} w-full pl-9 pr-3 placeholder:text-[var(--gray-3)] sm:w-[300px]`}
        />
      </div>
      {options.length > 1 && (
        <select
          value={currentFilter}
          onChange={(e) => commit({ [filterParam]: e.target.value })}
          aria-label={filterLabel}
          className={`${controlBase} ${chevron} cursor-pointer pl-3.5 pr-9 hover:border-[var(--gray-3)]`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
