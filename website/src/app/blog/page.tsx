import type { Metadata } from "next";
import { getAllPosts, formatPostDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Jasper AI",
  description:
    "Notes on scoping, building, and shipping custom AI systems — agents, RAG, knowledge graphs, and fine-tuned models.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
        Blog
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--gray-2)]">
        Notes on scoping, building, and shipping custom AI systems.
      </p>

      <div className="mt-14 flex flex-col divide-y divide-[var(--rule)]">
        {posts.map((post) => (
          <a
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group py-8 first:pt-0"
          >
            <div className="text-xs font-medium tracking-wide text-[var(--gray-1)]">
              {formatPostDate(post.date)}
            </div>
            <h2 className="mt-2 text-2xl font-semibold leading-snug tracking-tight transition group-hover:text-[var(--blue)]">
              {post.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-[var(--gray-2)]">
              {post.description}
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-[var(--blue)]">
              Read more →
            </span>
          </a>
        ))}

        {posts.length === 0 && (
          <p className="py-8 text-[var(--gray-2)]">
            No posts yet — check back soon.
          </p>
        )}
      </div>
    </section>
  );
}
