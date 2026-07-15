"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "./actions/contact";
import { fieldClass, selectClass } from "@/lib/ui";

const initialState: ContactState = { success: false };

const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--ink)]";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContact,
    initialState
  );

  if (state.success) {
    return (
      <div className="rounded-3xl bg-[var(--paper)] px-8 py-14 text-center sm:px-11">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-soft)]">
          <svg
            width="26"
            height="20"
            viewBox="0 0 26 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 10.5L9.5 18L24 2"
              stroke="var(--green)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="text-[28px] font-semibold tracking-tight text-[var(--ink)]">
          Got it — thanks.
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-[17px] leading-relaxed text-[var(--gray-2)]">
          Your inquiry landed in the pipeline. I&apos;ll be in touch within
          one business day.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/admin"
            className="rounded-full bg-[var(--blue)] px-[22px] py-3 text-[15px] font-medium text-white transition hover:opacity-90"
          >
            See it land in admin ›
          </a>
          <button
            type="button"
            data-testid="contact-submit-another"
            onClick={() => window.location.reload()}
            className="rounded-full border border-[var(--rule)] px-[22px] py-3 text-[15px] font-medium text-[var(--ink)] transition hover:border-[var(--gray-3)]"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mx-auto w-full max-w-xl space-y-5 rounded-3xl bg-[var(--paper)] p-9"
    >
      {/* Name + Email */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Name
          </label>
          <input
            id="contact-name"
            data-testid="contact-name"
            name="name"
            type="text"
            required
            placeholder="Ada Lovelace"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email
          </label>
          <input
            id="contact-email"
            data-testid="contact-email"
            name="email"
            type="email"
            required
            placeholder="ada@company.com"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Company + Type */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-company" className={labelClass}>
            Company
          </label>
          <input
            id="contact-company"
            data-testid="contact-company"
            name="company"
            type="text"
            placeholder="Analytical Engines Inc."
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="contact-type" className={labelClass}>
            What do you need?
          </label>
          <select
            id="contact-type"
            data-testid="contact-type"
            name="type"
            defaultValue="ai_development_project"
            className={selectClass}
          >
            <option value="ai_development_project">
              AI Development Project
            </option>
            <option value="ai_consulting">AI Consulting</option>
            <option value="ongoing_support">Ongoing Support</option>
            <option value="general_inquiry">General Inquiry</option>
          </select>
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="contact-message"
          data-testid="contact-message"
          name="message"
          rows={4}
          required
          placeholder="What are you trying to build, and what's the outcome you want?"
          className={`${fieldClass} min-h-24 resize-y`}
        />
      </div>

      {/* How they heard + Company size */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-how-heard" className={labelClass}>
            How did you hear about me?
          </label>
          <select
            id="contact-how-heard"
            data-testid="contact-how-heard"
            name="how_they_heard"
            defaultValue=""
            className={selectClass}
          >
            <option value="">Select one…</option>
            <option value="Referral">Referral</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Search">Search (Google)</option>
            <option value="Event">Event / conference</option>
            <option value="Website">Website / blog</option>
            <option value="GitHub">GitHub</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="contact-company-size" className={labelClass}>
            Company size
          </label>
          <select
            id="contact-company-size"
            data-testid="contact-company-size"
            name="company_size"
            defaultValue="Solo"
            className={selectClass}
          >
            <option>Solo</option>
            <option>Startup (2–10)</option>
            <option>Small Business (11–50)</option>
            <option>Medium Business (51–250)</option>
            <option>Enterprise (250+)</option>
          </select>
        </div>
      </div>

      {/* Estimated budget */}
      <div>
        <label htmlFor="contact-budget" className={labelClass}>
          Estimated project budget
        </label>
        <select
          id="contact-budget"
          data-testid="contact-budget"
          name="estimated_budget"
          defaultValue="Under $5k"
          className={selectClass}
        >
          <option>Under $5k</option>
          <option>$5k–$20k</option>
          <option>$20k–$50k</option>
          <option>Over $50k</option>
        </select>
      </div>

      {/* Newsletter opt-in */}
      <label className="flex items-start gap-3 text-sm text-[var(--gray-2)]">
        <input
          data-testid="contact-ok-to-contact"
          name="ok_to_contact"
          type="checkbox"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-[var(--blue)]"
        />
        <span>
          It&apos;s OK to email me occasional updates about AI engineering. You
          can opt out anytime.
        </span>
      </label>

      <button
        type="submit"
        data-testid="contact-submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--blue)] px-6 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send inquiry"}
      </button>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-center font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
