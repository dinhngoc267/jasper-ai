import { PageHeaderSkeleton, SkeletonBar } from "../skeletons";

/** Instant skeleton for the Leads tab: header plus a kanban-board placeholder
 * (columns of cards), matching the real `LeadsBoard` shape. */
export default function LeadsLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div
            key={col}
            className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-4"
          >
            <SkeletonBar className="h-3 w-24" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, card) => (
                <div
                  key={card}
                  className="rounded-xl border border-[var(--rule)] p-3"
                >
                  <SkeletonBar className="h-4 w-3/4" />
                  <SkeletonBar className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
