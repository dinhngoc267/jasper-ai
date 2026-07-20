"use client";

/**
 * Silent first-touch source capture (BUILD 3, part 3).
 *
 * Renders nothing. On first mount per browser session, records where the
 * visitor actually arrived — UTM params, referrer, and the landing page
 * (including a blog post slug, e.g. `/blog/scoping-ai-projects`) — into
 * `sessionStorage`. This MUST happen at first arrival, not at submit time:
 * by the time someone reaches `/contact`, `document.referrer` would only
 * ever say "came from /contact" itself. `contact-form.tsx` reads this same
 * sessionStorage key at submit time and posts it alongside the form so
 * `submitContact` (`app/actions/contact.ts`) can store it in
 * `contacts.metadata`.
 *
 * Mounted once in the root layout so it covers every page — marketing site
 * and blog alike — which is what lets a blog-post CTA click attribute
 * correctly even when the visitor lands on the post directly from search.
 */
import { useEffect } from "react";

const STORAGE_KEY = "jasper_first_touch";

export function SourceCapture() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY)) return;
      const params = new URLSearchParams(window.location.search);
      const firstTouch = {
        utm_source: params.get("utm_source") ?? undefined,
        utm_medium: params.get("utm_medium") ?? undefined,
        utm_campaign: params.get("utm_campaign") ?? undefined,
        referrer: document.referrer || undefined,
        landing_page: window.location.pathname,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(firstTouch));
    } catch {
      // Storage unavailable (private mode, blocked) — silently skip. Source
      // capture is a nice-to-have; it must never break the page.
    }
  }, []);

  return null;
}
