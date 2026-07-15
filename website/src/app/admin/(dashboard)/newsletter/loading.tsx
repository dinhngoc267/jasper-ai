import {
  PageHeaderSkeleton,
  TableSkeleton,
  ToolbarSkeleton,
} from "../skeletons";

/** Instant skeleton for the Newsletter tab: header, search + source-filter
 * toolbar, and a table placeholder. */
export default function NewsletterLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <PageHeaderSkeleton />
      <ToolbarSkeleton filters={1} />
      <TableSkeleton columns={5} />
    </div>
  );
}
