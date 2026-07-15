import {
  PageHeaderSkeleton,
  TableSkeleton,
  ToolbarSkeleton,
} from "../skeletons";

/** Instant skeleton for the People tab: header, search + segment-filter
 * toolbar, and a table placeholder. */
export default function PeopleLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <PageHeaderSkeleton />
      <ToolbarSkeleton filters={1} />
      <TableSkeleton columns={5} />
    </div>
  );
}
