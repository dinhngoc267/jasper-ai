import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSlugs, getPostBySlug, formatPostDate } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { BlogCta } from "@/components/blog-cta";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Jasper AI`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-24">
      <a
        href="/blog"
        className="text-sm font-medium text-[var(--gray-1)] transition hover:text-[var(--blue)]"
      >
        ← Blog
      </a>

      <div className="mt-6 text-xs font-medium tracking-wide text-[var(--gray-1)]">
        {formatPostDate(post.date)}
      </div>
      <h1 className="mt-2 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
        {post.title}
      </h1>

      <div className="mt-10">{renderMarkdown(post.bodyMarkdown)}</div>

      <BlogCta />
    </article>
  );
}
