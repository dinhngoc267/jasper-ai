import Link from "next/link";
import { POST_STATUS_LABELS, POST_STATUS_STYLES, type PostRow } from "@/lib/posts";
import { formatDate } from "@/lib/leads";

/**
 * Presentational table for one server-fetched page of posts. Search, status
 * filtering, and pagination all happen in the query (`content/page.tsx`) via
 * URL params — this just renders the rows it's given, each linking to its
 * detail page.
 */
export function ContentTable({ posts }: { posts: PostRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--rule)] text-xs uppercase tracking-wider text-[var(--gray-2)]">
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">LinkedIn</th>
            <th className="px-4 py-3 font-semibold">Created</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const style = POST_STATUS_STYLES[post.status];
            return (
              <tr
                key={post.id}
                className="border-b border-[var(--rule)] last:border-0 hover:bg-[var(--cream)]/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/content/${post.id}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--blue)]"
                  >
                    {post.title || post.slug}
                  </Link>
                  <p className="text-xs text-[var(--gray-2)]">{post.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                    style={{ background: style?.bg, color: style?.color }}
                  >
                    {POST_STATUS_LABELS[post.status] ?? post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--gray-2)]">
                  {post.linkedin_status ?? "—"}
                </td>
                <td className="px-4 py-3 text-[var(--gray-2)]">
                  {formatDate(post.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
