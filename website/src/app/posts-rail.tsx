"use client";

import { useEffect, useRef } from "react";

export type RailPost = {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
};

/**
 * Horizontal card rail for the homepage blog teaser. Cards sit side by side
 * and the track gently auto-advances one card at a time, looping back to the
 * start — pausing on hover/focus and disabled entirely under reduced-motion
 * or when everything already fits without scrolling.
 */
export function PostsRail({ posts }: { posts: RailPost[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || posts.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let paused = false;
    const pause = () => (paused = true);
    const resume = () => (paused = false);
    track.addEventListener("pointerenter", pause);
    track.addEventListener("pointerleave", resume);
    track.addEventListener("focusin", pause);
    track.addEventListener("focusout", resume);
    track.addEventListener("touchstart", pause, { passive: true });

    const id = window.setInterval(() => {
      if (paused) return;
      const card = track.querySelector<HTMLElement>("[data-card]");
      if (!card) return;
      const step = card.offsetWidth + 16; // card width + gap
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 8) return; // nothing to scroll — everything fits
      if (track.scrollLeft >= maxScroll - 8) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 4200);

    return () => {
      window.clearInterval(id);
      track.removeEventListener("pointerenter", pause);
      track.removeEventListener("pointerleave", resume);
      track.removeEventListener("focusin", pause);
      track.removeEventListener("focusout", resume);
      track.removeEventListener("touchstart", pause);
    };
  }, [posts.length]);

  return (
    <div
      ref={trackRef}
      className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {posts.map((post) => (
        <a
          key={post.slug}
          data-card
          href={`/blog/${post.slug}`}
          className="group flex w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--gray-3)] hover:shadow-md sm:w-[340px]"
        >
          <div className="text-xs font-medium tracking-wide text-[var(--gray-1)]">
            {post.dateLabel}
          </div>
          <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-[var(--ink)] transition group-hover:text-[var(--blue)]">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[var(--gray-2)]">
            {post.description}
          </p>
          <span className="mt-auto pt-5 text-sm font-medium text-[var(--blue)]">
            Read more →
          </span>
        </a>
      ))}
    </div>
  );
}
