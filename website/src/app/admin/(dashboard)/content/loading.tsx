import { PageHeaderSkeleton, TableSkeleton, ToolbarSkeleton } from "../skeletons";

/** Instant skeleton for the Content tab: header, toolbar, table placeholder. */
export default function ContentLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <PageHeaderSkeleton />
      <ToolbarSkeleton filters={1} />
      <TableSkeleton columns={4} />
    </div>
  );
}
