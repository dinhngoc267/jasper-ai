"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  APPROVE_TRANSITIONS,
  REJECTABLE_STATUSES,
  type PostStatus,
} from "@/lib/posts";

export type PostActionState = {
  success: boolean;
  error?: string;
};

function field(formData: FormData, key: string): string {
  return formData.get(key)?.toString().trim() ?? "";
}

async function logTransition(
  postId: string,
  fromStatus: string,
  toStatus: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("posts_activity_log").insert({
    post_id: postId,
    from_status: fromStatus,
    to_status: toStatus,
  });
  if (error) throw error;
}

/** Comma-separated tags input -> string[] (trimmed, de-duped, non-empty). */
function tags(formData: FormData): string[] {
  const seen = new Set<string>();
  for (const raw of field(formData, "tags").split(",")) {
    const t = raw.trim();
    if (t) seen.add(t);
  }
  return [...seen];
}

/**
 * Save the editable fields on a post without changing its status — the detail
 * page's inline edit. A content item is title + body plus blog settings; this
 * writes all of them so one action covers every stage. If the published page's
 * content changed, revalidate the blog too so the live site reflects the edit.
 */
export async function updatePost(
  postId: string,
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("posts")
      .update({
        title: field(formData, "title") || null,
        body_markdown: field(formData, "body_markdown") || null,
        description: field(formData, "description") || null,
        tags: tags(formData),
        target_keyword: field(formData, "target_keyword") || null,
        hero_image_url: field(formData, "hero_image_url") || null,
        linkedin_draft: field(formData, "linkedin_draft") || null,
      })
      .eq("id", postId)
      .select("slug, status")
      .single();

    if (error) throw error;

    revalidatePath(`/admin/content/${postId}`);
    if (data?.status === "published") {
      revalidatePath("/blog");
      revalidatePath(`/blog/${data.slug}`);
    }
    return { success: true };
  } catch (err) {
    console.error("[posts] failed to update post:", err);
    return { success: false, error: "Couldn't save changes. Please try again." };
  }
}

/** Advance a post to the next stage per `APPROVE_TRANSITIONS`, writing one
 * `posts_activity_log` row. Setting `published_at` happens only on the
 * `approved` -> `published` hop. */
export async function approvePost(
  postId: string,
  currentStatus: PostStatus
): Promise<PostActionState> {
  const nextStatus = APPROVE_TRANSITIONS[currentStatus];
  if (!nextStatus) {
    return { success: false, error: `"${currentStatus}" has no approve action.` };
  }

  try {
    const supabase = getSupabaseAdmin();
    const update: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "published") update.published_at = new Date().toISOString();

    const { error } = await supabase.from("posts").update(update).eq("id", postId);
    if (error) throw error;

    await logTransition(postId, currentStatus, nextStatus);

    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${postId}`);
    if (nextStatus === "published") {
      revalidatePath("/blog");
    }
    return { success: true };
  } catch (err) {
    console.error("[posts] failed to approve post:", err);
    return { success: false, error: "Couldn't approve this post. Please try again." };
  }
}

/** Reject a post from any `*_pending_review` stage — a terminal state. */
export async function rejectPost(
  postId: string,
  currentStatus: PostStatus
): Promise<PostActionState> {
  if (!REJECTABLE_STATUSES.includes(currentStatus)) {
    return { success: false, error: `"${currentStatus}" can't be rejected.` };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("posts")
      .update({ status: "rejected" })
      .eq("id", postId);
    if (error) throw error;

    await logTransition(postId, currentStatus, "rejected");

    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${postId}`);
    return { success: true };
  } catch (err) {
    console.error("[posts] failed to reject post:", err);
    return { success: false, error: "Couldn't reject this post. Please try again." };
  }
}
