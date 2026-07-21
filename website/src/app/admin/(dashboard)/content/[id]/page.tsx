import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { type PostRow } from "@/lib/posts";
import { PostDetailForm } from "./post-detail-form";

// Render on every request — never at build time (there is no database
// during `next build`). Same pattern as the other admin pages.
export const dynamic = "force-dynamic";

async function fetchPost(id: string): Promise<PostRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as PostRow) ?? null;
}

export default async function AdminContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await fetchPost(id);
  if (!post) notFound();

  // The form component owns the whole layout (toolbar, title, sections).
  return <PostDetailForm post={post} />;
}
