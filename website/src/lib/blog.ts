import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
}

export interface Post extends PostMeta {
  /** Raw markdown body, frontmatter and H1 stripped. */
  bodyMarkdown: string;
}

type PostRow = {
  slug: string;
  title: string | null;
  description: string | null;
  body_markdown: string | null;
  published_at: string | null;
  created_at: string;
};

function rowToPost(row: PostRow): Post {
  return {
    slug: row.slug,
    title: row.title ?? "",
    description: row.description ?? "",
    date: (row.published_at ?? row.created_at).slice(0, 10),
    bodyMarkdown: row.body_markdown ?? "",
  };
}

const POST_COLUMNS = "slug, title, description, body_markdown, published_at, created_at";

export async function getAllSlugs(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("posts").select("slug").eq("status", "published");
  if (error) throw error;
  return (data ?? []).map((row) => row.slug as string);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToPost(data as PostRow);
}

export async function getAllPosts(): Promise<Post[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToPost(row as PostRow));
}

/** Formats a "YYYY-MM-DD" date string without shifting a day due to UTC parsing. */
export function formatPostDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
