import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "./contact-form";
import { getAllPosts, formatPostDate } from "@/lib/blog";

const SERVICES = [
  {
    title: "AI Development",
    text: "Fixed-scope builds: AI agents, RAG systems, knowledge graphs, custom LLM apps.",
  },
  {
    title: "AI Consulting",
    text: "Use-case evaluation, architecture design, and implementation planning.",
  },
  {
    title: "Ongoing Support",
    text: "Monthly retainers for continuous development and maintenance.",
  },
];

const PAIN_POINTS = [
  {
    q: "“The demo was great. Then it never shipped.”",
    a: (
      <>
        Every project is{" "}
        <strong className="text-[var(--ink)]">
          fixed-scope with a definition of done
        </strong>{" "}
        — we agree up front what &ldquo;shipped&rdquo; means, and that&apos;s
        what you pay for.
      </>
    ),
  },
  {
    q: "“The agency handed us a black box nobody could maintain.”",
    a: (
      <>
        You get{" "}
        <strong className="text-[var(--ink)]">
          documented, handover-ready code
        </strong>{" "}
        — and if you&apos;d rather not maintain it, a monthly retainer keeps the
        engineer who built it on call.
      </>
    ),
  },
  {
    q: "“We don't even know if AI fits our use case.”",
    a: (
      <>
        That&apos;s what{" "}
        <strong className="text-[var(--ink)]">consulting is for</strong>:
        use-case evaluation and architecture design before you commit a build
        budget. Sometimes the honest answer is &ldquo;don&apos;t build
        this.&rdquo;
      </>
    ),
  },
];

const STEPS = [
  {
    n: "1",
    title: "Send an inquiry",
    text: "Use the form below. I reply within one business day.",
  },
  {
    n: "2",
    title: "Discovery call",
    text: "30 minutes on your use case, data, and constraints. Free, no deck.",
  },
  {
    n: "3",
    title: "Fixed-scope proposal",
    text: "Deliverables, timeline, and one price. No hourly meters running.",
  },
  {
    n: "4",
    title: "Build & ship",
    text: "Working software in production — with optional ongoing support after.",
  },
];

const FAQS = [
  {
    q: "What kind of projects do you take on?",
    a: "AI agents, RAG systems, knowledge graph solutions, and custom LLM applications — fixed-scope builds that end in working software, not slide decks.",
  },
  {
    q: "How does pricing work?",
    a: "Development projects are fixed-scope and fixed-price, agreed before work starts. Consulting is scoped per engagement. Ongoing support is a flat monthly retainer.",
  },
  {
    q: "How long does a typical build take?",
    a: "Most fixed-scope builds land in 2–8 weeks depending on complexity. You'll get a concrete timeline in the proposal, and it's part of the definition of done.",
  },
  {
    q: "Who owns the code and the data?",
    a: "You do. Full IP transfer on final payment, and your data never leaves infrastructure you control.",
  },
  {
    q: "What if we're not sure AI is the right answer?",
    a: "Start with a consulting engagement. Use-case evaluation exists precisely so you don't spend a build budget finding out.",
  },
];

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <main className="flex-1 font-sans text-[var(--ink)]">
      {/* NAV */}
      <div className="sticky top-0 z-20 border-b border-[var(--rule)] bg-white/72 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-6">
          <div className="text-[19px] font-semibold tracking-tight">
            Jasper<span className="text-[var(--gray-1)]">·</span>AI
          </div>
          <div className="flex items-center gap-6 text-[13px] text-[var(--ink)]">
            <a href="#work" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              Work
            </a>
            <a href="#why" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              Why
            </a>
            <a href="#how" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              How it works
            </a>
            <a href="#faq" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              FAQ
            </a>
            <a href="/blog" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              Blog
            </a>
            <a href="#contact" className="hidden transition hover:text-[var(--gray-2)] sm:inline">
              Contact
            </a>
            <a
              href="/admin"
              className="rounded-full border border-[var(--rule)] px-3 py-[5px] text-xs font-medium text-[var(--ink)] transition hover:border-[var(--gray-3)]"
            >
              Admin
            </a>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
        <div className="mb-5 text-[13px] font-semibold tracking-tight text-[var(--blue)]">
          AI development · consulting · retainers
        </div>
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-[66px]">
          AI systems,
          <br />
          built to spec.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--gray-2)] sm:text-xl">
          Custom AI agents, RAG systems, and LLM applications — designed, built,
          and maintained by an engineer who&apos;s done it before.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3.5">
          <a
            href="#contact"
            className="inline-block rounded-full bg-[var(--blue)] px-[26px] py-[13px] text-base font-medium text-white transition hover:opacity-90"
          >
            Start a conversation
          </a>
          <a
            href="#services"
            className="inline-block px-2 py-[13px] text-base font-medium text-[var(--blue)]"
          >
            See what I build ›
          </a>
        </div>
      </section>

      {/* SERVICES */}
      <section
        id="services"
        className="scroll-mt-[52px] bg-[var(--cream)] px-6 py-[88px]"
      >
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl bg-[var(--paper)] p-6 text-left"
            >
              <h3 className="text-base font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--gray-2)]">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WORK — shipped, not slideware */}
      <section id="work" className="scroll-mt-[52px] bg-[var(--paper)] px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2">
          <div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Shipped, not slideware.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--gray-2)]">
              Every engagement ends with running software you own — deployed,
              documented, and handed off. No lock-in, no mystery.
            </p>
            <ul className="mt-6 flex flex-col gap-3.5">
              {[
                "Support agents that resolve tickets end-to-end",
                "RAG search over internal document stores",
                "Knowledge graphs that connect siloed data",
              ].map((item) => (
                <li key={item} className="flex items-baseline gap-3 text-[15px]">
                  <span className="h-1.5 w-1.5 flex-none -translate-y-0.5 rounded-full bg-[var(--blue)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--rule)]">
            <Image
              src="/case-study.png"
              alt="Support agent console — a shipped AI system example"
              width={1200}
              height={900}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* WHY — problem / positioning */}
      <section id="why" className="scroll-mt-[52px] bg-[var(--cream)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            You&apos;ve probably seen AI projects stall.
          </h2>
          <p className="mx-auto mt-3 mb-8 max-w-xl text-center text-[var(--gray-2)]">
            Most AI initiatives die between the demo and production. Here&apos;s
            how this engagement is built differently.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {PAIN_POINTS.map((p) => (
              <div
                key={p.q}
                className="rounded-2xl bg-[var(--paper)] p-6"
              >
                <div className="text-sm font-semibold leading-snug">{p.q}</div>
                <div className="mt-2 text-sm text-[var(--gray-2)]">{p.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="scroll-mt-[52px] bg-[var(--paper)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mx-auto mt-3 mb-8 max-w-xl text-center text-[var(--gray-2)]">
            A simple path from first message to shipped system — you always know
            which step you&apos;re on.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-[var(--cream)] p-6">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--blue)] text-xs font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-[var(--gray-2)]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-[52px] bg-[var(--cream)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Common questions
          </h2>
          <p className="mx-auto mt-3 mb-8 max-w-xl text-center text-[var(--gray-2)]">
            If yours isn&apos;t here, send it through the form — that&apos;s what
            &ldquo;General Inquiry&rdquo; is for.
          </p>
          <div className="mx-auto max-w-2xl">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group border-b border-[var(--rule)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="ml-4 text-lg font-normal text-[var(--gray-1)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 text-sm text-[var(--gray-2)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST POSTS */}
      <section className="bg-[var(--paper)] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            From the blog
          </h2>
          <p className="mx-auto mt-3 mb-8 max-w-xl text-center text-[var(--gray-2)]">
            Notes on scoping, building, and shipping custom AI systems.
          </p>

          {recentPosts.length > 0 && (
            <div className="flex flex-col divide-y divide-[var(--rule)]">
              {recentPosts.map((post) => (
                <a
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group py-8 first:pt-0"
                >
                  <div className="text-xs font-medium tracking-wide text-[var(--gray-1)]">
                    {formatPostDate(post.date)}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold leading-snug tracking-tight transition group-hover:text-[var(--blue)]">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-[var(--gray-2)]">
                    {post.description}
                  </p>
                  <span className="mt-3 inline-block text-sm font-medium text-[var(--blue)]">
                    Read more →
                  </span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/blog"
              className="text-sm font-medium text-[var(--blue)] transition hover:opacity-80"
            >
              View all posts →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="bg-[var(--paper)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-[var(--ink)] px-8 py-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Ready when you are.
            </h2>
            <p className="mx-auto mt-2 mb-6 max-w-md text-[var(--gray-3)]">
              Tell me what you&apos;re trying to build. Worst case, you leave the
              discovery call knowing what not to build.
            </p>
            <a
              href="#contact"
              className="inline-block rounded-full bg-white px-7 py-3 font-semibold text-[var(--ink)] transition hover:opacity-90"
            >
              Start a conversation
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="scroll-mt-[52px] bg-[var(--cream)] px-6 py-[88px]"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-4xl font-semibold tracking-tight">
            Start a conversation
          </h2>
          <p className="mt-2.5 mb-10 text-center text-lg text-[var(--gray-2)]">
            Tell me what you&apos;re building. I reply within one business day.
          </p>
          <ContactForm />
        </div>
      </section>

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
