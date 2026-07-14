"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "./actions/contact";

const initialState: ContactState = { success: false };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContact,
    initialState
  );

  return (
    <form action={formAction} className="mx-auto w-full max-w-xl space-y-5">
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
        >
          Name
        </label>
        <input
          id="contact-name"
          data-testid="contact-name"
          name="name"
          type="text"
          required
          placeholder="Ada Lovelace"
          className="w-full rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-soft)]"
        />
      </div>
      <div>
        <label
          htmlFor="contact-email"
          className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
        >
          Email
        </label>
        <input
          id="contact-email"
          data-testid="contact-email"
          name="email"
          type="email"
          required
          placeholder="ada@company.com"
          className="w-full rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-soft)]"
        />
      </div>
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          data-testid="contact-message"
          name="message"
          rows={4}
          required
          placeholder="What are you trying to build, and what's the outcome you want?"
          className="w-full rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-soft)]"
        />
      </div>
      <button
        type="submit"
        data-testid="contact-submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--blue)] px-6 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send Message"}
      </button>
      {state.success && (
        <p
          data-testid="contact-success"
          className="rounded-lg bg-[var(--blue-soft)] px-4 py-3 text-center font-medium text-[var(--blue)]"
        >
          Message sent — we&apos;ll be in touch soon.
        </p>
      )}
      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-center font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
