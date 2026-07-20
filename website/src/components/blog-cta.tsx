import Link from "next/link";

/**
 * Shared end-of-post CTA (BUILD 3, part 5) — appended to every blog post,
 * linking to the homepage contact form. No slug-passing logic needed here:
 * `SourceCapture` (mounted in the root layout) already records the FIRST
 * page a visitor lands on for the session, so a visitor who arrives directly
 * on this post gets it captured as their first-touch landing page
 * automatically, and `contact-form.tsx` carries that through to
 * `contacts.metadata` on submit.
 */
export function BlogCta() {
  return (
    <div className="mt-16 rounded-3xl bg-[var(--cream)]/60 px-8 py-10 text-center">
      <h3 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
        Scoping an AI project?
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-[var(--gray-2)]">
        Let&apos;s talk about what you&apos;re trying to build and whether a
        fixed-scope engagement makes sense.
      </p>
      <Link
        href="/#contact"
        className="mt-6 inline-block rounded-full bg-[var(--blue)] px-6 py-3 text-[15px] font-medium text-white transition hover:opacity-90"
      >
        Let&apos;s talk →
      </Link>
    </div>
  );
}
