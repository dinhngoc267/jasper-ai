export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex-1 font-sans text-[var(--ink)]">
      {/* NAV */}
      <div className="sticky top-0 z-20 border-b border-[var(--rule)] bg-white/72 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-6">
          <a href="/" className="text-[19px] font-semibold tracking-tight">
            Jasper<span className="text-[var(--gray-1)]">·</span>AI
          </a>
          <div className="flex items-center gap-6 text-[13px] text-[var(--ink)]">
            <a href="/blog" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              Blog
            </a>
            <a href="/#contact" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              Contact
            </a>
            <a
              href="/#contact"
              className="rounded-full bg-[var(--blue)] px-3.5 py-[7px] text-xs font-medium text-white transition hover:opacity-90"
            >
              Start a conversation
            </a>
          </div>
        </nav>
      </div>

      {children}

      {/* FOOTER */}
      <footer className="mx-auto flex max-w-5xl items-center justify-between border-t border-[var(--rule)] px-6 py-9">
        <span className="text-xs text-[var(--gray-1)]">
          © 2026 Jasper AI · jasper-ai.com
        </span>
        <span className="text-xs text-[var(--gray-1)]">San Francisco, CA</span>
      </footer>
    </main>
  );
}
