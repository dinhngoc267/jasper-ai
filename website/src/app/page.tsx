import { ContactForm } from "./contact-form";

const TRACKS: {
  number: string;
  name: string;
  wide?: boolean;
  protocols: { p: string; text: string }[];
}[] = [
  {
    number: "01",
    name: "Mindset",
    wide: true,
    protocols: [
      { p: "P1", text: "Humans are the orchestrator. The real intelligence is still you." },
      { p: "P2", text: "The CMS is dead. AI is the CMS." },
      { p: "P3", text: "The stack: Claude, GitHub, Vercel, Supabase. Master four tools. Ship anything." },
      { p: "P4", text: "Agents are folders, not magic. Structure beats novelty." },
    ],
  },
  {
    number: "02",
    name: "Infrastructure",
    protocols: [
      { p: "P5", text: "GitHub — version control for all code and context." },
      { p: "P6", text: "Vercel — deploys only via git push. Never vercel deploy directly." },
      { p: "P7", text: "Supabase — data, auth, and subscribers." },
    ],
  },
  {
    number: "03",
    name: "Building",
    protocols: [
      { p: "P8", text: "Design system written before any component ever gets built." },
      { p: "P9", text: "Concrete step-by-step workflows that turn intent into output." },
      { p: "P10", text: "Communications go out automatically via scheduled PM runs." },
      { p: "P11", text: "Skills for admin so humans never have to escalate for small things." },
    ],
  },
  {
    number: "04",
    name: "Team and Ops",
    protocols: [
      { p: "P12", text: "DevOps escalates to a human engineer when needed — never guesses on infrastructure." },
      { p: "P13", text: "8 fixed agent roles. No improvising new ones." },
      { p: "P14", text: "PM plans every epic with acceptance criteria before a single line of code." },
      { p: "P15", text: "PM reads git history before every task — always knows what shipped yesterday." },
    ],
  },
  {
    number: "05",
    name: "Continuity",
    protocols: [
      { p: "P16", text: "QA knows exactly what AI can and cannot test — and flags the rest to a human." },
      { p: "P17", text: "Context handed off via BRIDGE.md and the memory system — no knowledge tax between sessions." },
      { p: "P18", text: "Work outlives the operator — agents repo + sync-agents means any machine can be set up from GitHub." },
    ],
  },
];

const BENEFITS = [
  {
    icon: "🚢",
    title: "AI that actually ships",
    text: "Fixed-scope builds — agents, RAG systems, knowledge graphs, custom LLM apps — with a definition of done, not a demo that dies in a slide deck.",
  },
  {
    icon: "🧭",
    title: "Clarity before you spend",
    text: "Use-case evaluation and architecture design first, so you commit a build budget only to the things AI can genuinely do for your business.",
  },
  {
    icon: "🔧",
    title: "An engineer who stays",
    text: "Monthly support and development retainers keep the person who built your system on call — no black-box handoffs, no orphaned code.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 font-sans text-[var(--ink)]">
      {/* SECTION 1 — HERO */}
      <section className="bg-[var(--ink)] px-6 py-28 text-center sm:py-36">
        <h1 className="text-5xl font-bold tracking-tight text-white">
          Hello, Jasper AI.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--gray-3)]">
          AI systems that ship — custom agents, RAG systems, and LLM
          applications, built by an engineer who&apos;s done it before.
        </p>
        <div className="mt-9">
          <a
            href="#contact"
            className="inline-block rounded-lg bg-[var(--blue)] px-8 py-3.5 font-semibold text-white transition hover:opacity-90"
          >
            Let&apos;s Talk
          </a>
        </div>
        <a
          href="#protocols"
          className="mt-5 inline-block text-sm text-[var(--gray-1)] transition hover:text-white"
        >
          See how it works ↓
        </a>
      </section>

      {/* SECTION 2 — WHAT YOU GET */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          What You Get
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border border-[var(--rule)] bg-[var(--paper)] p-7"
            >
              <div className="text-3xl" aria-hidden>
                {b.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gray-2)]">
                {b.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 — THE 18 PROTOCOLS */}
      <section id="protocols" className="bg-[#F8FAFC] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            The 18 Protocols
          </h2>
          <p className="mt-3 text-center text-[var(--gray-2)]">
            The operating system behind every Infinite Leverage team.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {TRACKS.map((track) => (
              <div
                key={track.number}
                className={`rounded-xl border border-[var(--rule)] bg-[var(--paper)] p-7 ${
                  track.wide ? "md:col-span-2" : ""
                }`}
              >
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--blue)]">
                  Track {track.number}
                </div>
                <h3 className="mt-1 text-xl font-bold">{track.name}</h3>
                <ol className="mt-4 space-y-2.5">
                  {track.protocols.map((proto) => (
                    <li key={proto.p} className="flex gap-3 text-sm leading-relaxed">
                      <span className="shrink-0 font-mono font-semibold text-[var(--blue)]">
                        {proto.p}
                      </span>
                      <span className="text-[var(--ink-soft)]">{proto.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — CONTACT FORM */}
      <section id="contact" className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Get in Touch
        </h2>
        <p className="mt-3 text-center text-[var(--gray-2)]">
          Ready to build your AI team? Let&apos;s talk.
        </p>
        <div className="mt-10">
          <ContactForm />
        </div>
      </section>

      {/* SECTION 5 — FINAL CTA */}
      <section className="bg-[var(--ink)] px-6 py-20 text-center">
        <a
          href="#contact"
          className="inline-block rounded-lg bg-[var(--blue)] px-8 py-3.5 font-semibold text-white transition hover:opacity-90"
        >
          Let&apos;s Talk
        </a>
        <p className="mt-5 text-sm text-[var(--gray-1)]">
          Working with founders across Vietnam, Australia, and the US.
        </p>
      </section>
    </main>
  );
}
