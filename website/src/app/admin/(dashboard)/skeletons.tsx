/**
 * Shared loading-skeleton primitives for the admin `(dashboard)` route group.
 * These render instantly from `loading.tsx` files while a page's server fetch
 * streams in, so tab navigation feels immediate instead of blocking.
 *
 * All shapes are styled purely off the Apple-minimalist design tokens
 * (`--rule`, `--cream`, `--paper`, …) and mirror the real layout (page header
 * + card/table placeholders). The pulse uses Tailwind's `animate-pulse` with
 * `motion-reduce:animate-none`, so it's suppressed for
 * `prefers-reduced-motion` users.
 */

/** A single grey placeholder bar. `--cream` reads as a "not-yet-loaded" fill
 * against the white `--paper` cards. */
export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-[var(--cream)] ${className}`} />;
}

/** Page title + subtitle placeholder, matching each page's `<header>`. */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-10">
      <SkeletonBar className="h-9 w-56" />
      <SkeletonBar className="mt-3 h-4 w-80 max-w-full" />
    </div>
  );
}

/** Generic table placeholder inside the standard bordered card. */
export function TableSkeleton({
  columns = 5,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
      <div className="flex gap-4 border-b border-[var(--rule)] px-4 py-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBar key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-[var(--rule)] px-4 py-4 last:border-0"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="flex flex-1 items-center gap-2.5">
              {c === 0 && (
                <SkeletonBar className="h-[30px] w-[30px] shrink-0 rounded-full" />
              )}
              <SkeletonBar className="h-4 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Search input (+ optional filter select) placeholder above a table. */
export function ToolbarSkeleton({ filters = 1 }: { filters?: number }) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <SkeletonBar className="h-[50px] w-full max-w-sm" />
      {Array.from({ length: filters }).map((_, i) => (
        <SkeletonBar key={i} className="h-[50px] w-40" />
      ))}
    </div>
  );
}
