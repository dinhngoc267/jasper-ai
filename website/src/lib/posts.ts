/**
 * Shared types, labels, and formatting for the admin Content pipeline
 * (`/admin/content`). Deliberately has NO server-only imports, same pattern
 * as `@/lib/leads` and `@/lib/orders`, so it can be imported from both the
 * server-fetching pages and client form components.
 */

export const POST_STATUSES = ["pending_review", "published", "rejected"] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABELS: Record<string, string> = {
  pending_review: "Needs review",
  published: "Published",
  rejected: "Rejected",
};

export const POST_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending_review: { bg: "var(--amber-soft)", color: "#c26a00" },
  published: { bg: "var(--green-soft)", color: "#1a7a34" },
  rejected: { bg: "var(--red-soft)", color: "#c0392b" },
};

/** Stage a status transitions to when the operator clicks Publish. The
 * routine writes a complete post straight to `pending_review`, so publishing
 * is the single forward hop. */
export const APPROVE_TRANSITIONS: Partial<Record<PostStatus, PostStatus>> = {
  pending_review: "published",
};

/** Statuses Reject can be applied from. */
export const REJECTABLE_STATUSES: readonly PostStatus[] = ["pending_review"];

export type PostRow = {
  id: string;
  slug: string;
  status: PostStatus;
  // The document.
  title: string | null;
  body_markdown: string | null;
  description: string | null;
  // Blog settings.
  tags: string[] | null;
  target_keyword: string | null;
  hero_image_url: string | null;
  linkedin_draft: string | null;
  linkedin_status: string | null;
  // Provenance (read-only).
  source_channel: string | null;
  source_confidence: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function matchesPostSearch(post: Pick<PostRow, "slug" | "title">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [post.slug, post.title]
    .filter((field): field is string => Boolean(field))
    .some((field) => field.toLowerCase().includes(q));
}
