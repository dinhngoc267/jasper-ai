import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Rows per page for every admin list tab. Deliberately low (10) so pagination
 * is demonstrable with the current seeded volume (Orders 18, Subscribers 21,
 * People 26). Tune upward (25 / 50) once real volume grows — it's the single
 * source of truth the pages and `.range()` math both read from.
 */
export const PAGE_SIZE = 10;

/**
 * Server-rendered pagination control. Prev / Next are real links that set
 * `?page=`, so the list stays a server component and the browser back button
 * works. All other query params (search, filter) are preserved via `params`.
 */
export function Pagination({
  page,
  total,
  pathname,
  params,
  pageSize = PAGE_SIZE,
}: {
  /** Current 1-based page. */
  page: number;
  /** Total matching rows (from a `{ count: "exact" }` select). */
  total: number;
  /** Path to link back to, e.g. "/admin/orders". */
  pathname: string;
  /** Other params to keep on the URL (q, status/heard/segment) — no `page`. */
  params: Record<string, string>;
  pageSize?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const href = (p: number) => {
    const sp = new URLSearchParams(params);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

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
        <PagerLink href={href(current - 1)} disabled={current <= 1} label="Previous page">
          <ChevronLeft size={15} />
          Prev
        </PagerLink>
        <span className="px-2 text-xs text-[var(--gray-2)]">
          Page <span className="font-medium text-[var(--ink)]">{current}</span> of{" "}
          {totalPages}
        </span>
        <PagerLink href={href(current + 1)} disabled={current >= totalPages} label="Next page">
          Next
          <ChevronRight size={15} />
        </PagerLink>
      </div>
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${base} cursor-not-allowed border-[var(--rule)] text-[var(--gray-1)] opacity-50`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      scroll={false}
      className={`${base} border-[var(--rule)] text-[var(--ink)] hover:border-[var(--blue)] hover:text-[var(--blue)]`}
    >
      {children}
    </Link>
  );
}
