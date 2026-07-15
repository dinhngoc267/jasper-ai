import { SkeletonBar } from "./skeletons";

/**
 * Instant skeleton for the Dashboard (the `(dashboard)` index route) while its
 * server-side aggregate queries run. Mirrors the real layout: header + period
 * toggle, a KPI row, two charts, a wide revenue chart, and the
 * "needs attention" table. Also serves as the fallback skeleton for any tab in
 * this group that doesn't ship its own `loading.tsx`.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SkeletonBar className="h-9 w-44" />
          <SkeletonBar className="mt-3 h-4 w-72 max-w-full" />
        </div>
        <SkeletonBar className="h-9 w-44" />
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5"
          >
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="mt-4 h-8 w-20" />
            <SkeletonBar className="mt-3 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5 lg:col-span-2">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="mt-2 h-3 w-40" />
          <SkeletonBar className="mt-5 h-52 w-full" />
        </div>
        <div className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="mt-2 h-3 w-40" />
          <SkeletonBar className="mt-5 h-52 w-full" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="mt-2 h-3 w-40" />
        <SkeletonBar className="mt-5 h-44 w-full" />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5">
        <SkeletonBar className="h-4 w-40" />
        <SkeletonBar className="mt-4 h-40 w-full" />
      </div>
    </div>
  );
}
