"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { approvePost, rejectPost, updatePost } from "@/app/actions/posts";
import {
  APPROVE_TRANSITIONS,
  POST_STATUS_LABELS,
  POST_STATUS_STYLES,
  REJECTABLE_STATUSES,
  type PostRow,
} from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/leads";

const FORM_ID = "post-detail-form";

/**
 * Content detail + review. A content item is a blog post: the hero is the
 * document itself — title + body — written in Markdown and previewed exactly
 * as the live blog renders it. Everything secondary (SEO, tags, hero image,
 * LinkedIn) lives in a collapsible Blog settings panel. A sticky action bar
 * carries the decision (Approve/Reject) and Save.
 */
export function PostDetailForm({ post }: { post: PostRow }) {
  const [state, formAction, pending] = useActionState(
    updatePost.bind(null, post.id),
    { success: false }
  );
  const [isTransitioning, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  const [title, setTitle] = useState(post.title ?? "");
  const [body, setBody] = useState(post.body_markdown ?? "");
  const [tab, setTab] = useState<"write" | "preview">(
    post.body_markdown ? "preview" : "write"
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Title is a wrapping textarea that grows to fit — long titles are common
  // and a single-line input would clip them.
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending, state.success]);

  const nextStatus = APPROVE_TRANSITIONS[post.status];
  const canReject = REJECTABLE_STATUSES.includes(post.status);
  const style = POST_STATUS_STYLES[post.status];
  const hasBody = body.trim().length > 0;

  function runAction(fn: () => Promise<{ success: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) setActionError(result.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="mx-auto max-w-[820px]">
      {/* Sticky action bar — the decision stays reachable while scrolling. */}
      <div className="sticky top-4 z-10 mb-8 flex items-center gap-3 rounded-2xl border border-[var(--rule)] bg-[var(--paper)]/85 px-4 py-3 shadow-sm backdrop-blur-xl">
        <Link
          href="/admin/content"
          className="text-sm font-medium text-[var(--gray-1)] transition hover:text-[var(--ink)]"
        >
          ← Content
        </Link>
        <span
          className="ml-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{ background: style?.bg, color: style?.color }}
        >
          {POST_STATUS_LABELS[post.status] ?? post.status}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {saved && (
            <span className="mr-1 text-[13px] font-medium text-[var(--green)]">
              Saved
            </span>
          )}
          <button
            type="submit"
            form={FORM_ID}
            disabled={pending}
            className="rounded-full border border-[var(--rule)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--gray-3)] hover:bg-[var(--cream)] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {canReject && (
            <button
              type="button"
              onClick={() => runAction(() => rejectPost(post.id, post.status))}
              disabled={isTransitioning}
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--gray-2)] transition hover:bg-[var(--red-soft)] hover:text-[var(--red)] disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {nextStatus && (
            <button
              type="button"
              onClick={() => runAction(() => approvePost(post.id, post.status))}
              disabled={isTransitioning}
              className="rounded-full bg-[var(--blue)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {isTransitioning ? "Working…" : approveLabel(nextStatus)}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="mb-6 rounded-xl bg-[var(--red-soft)] px-4 py-3 text-sm font-medium text-[var(--red)]">
          {actionError}
        </p>
      )}

      <form id={FORM_ID} action={formAction}>
        {/* Write / Preview toggle sits above the document. */}
        <div className="mb-4 flex items-center justify-end">
          <div className="inline-flex rounded-full bg-[var(--cream)] p-0.5 text-[13px] font-semibold">
            <Segment active={tab === "write"} onClick={() => setTab("write")}>
              Write
            </Segment>
            <Segment active={tab === "preview"} onClick={() => setTab("preview")}>
              Preview
            </Segment>
          </div>
        </div>

        {tab === "write" ? (
          <div className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] px-8 py-8 sm:px-10 sm:py-10">
            <textarea
              ref={titleRef}
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={1}
              placeholder="Title"
              aria-label="Title"
              className="w-full resize-none overflow-hidden bg-transparent text-[32px] font-semibold leading-[1.15] tracking-tight text-[var(--ink)] outline-none placeholder:text-[var(--gray-3)]"
            />
            <div className="my-6 h-px bg-[var(--rule)]" />
            <textarea
              name="body_markdown"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the post in Markdown — ## for headings, **bold**, [links](url), and - for bullets. During the brief stage this is the short plan; the writer expands it into the full article."
              className="min-h-[440px] w-full resize-none bg-transparent text-[17px] leading-[1.75] text-[var(--ink-soft)] outline-none placeholder:text-[var(--gray-3)]"
            />
          </div>
        ) : (
          <article className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] px-8 py-10 sm:px-14 sm:py-14">
            {/* Hidden inputs keep the controlled values in the form payload
                even while Preview is showing instead of the textareas. */}
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="body_markdown" value={body} />
            <h1 className="mb-8 text-[34px] font-semibold leading-[1.12] tracking-tight text-[var(--ink)]">
              {title || "Untitled"}
            </h1>
            {hasBody ? (
              renderMarkdown(body)
            ) : (
              <p className="text-[var(--gray-2)]">
                Nothing written yet. Switch to Write to start the draft.
              </p>
            )}
          </article>
        )}

        <p className="mt-3 px-1 text-[13px] text-[var(--gray-1)]">
          /{post.slug} · updated {formatDate(post.updated_at)}
          {post.published_at && ` · published ${formatDate(post.published_at)}`}
          {post.source_channel && ` · via ${post.source_channel}`}
        </p>

        {/* Blog settings — secondary, collapsed by default. */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[var(--cream)]/40"
          >
            <span className="text-sm font-semibold text-[var(--ink)]">Blog settings</span>
            <span className="text-[13px] text-[var(--gray-1)]">
              {settingsOpen ? "Hide" : "SEO, tags, image, LinkedIn"}
            </span>
          </button>

          {settingsOpen && (
            <div className="divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
              <RowTextarea
                name="description"
                label="Description"
                defaultValue={post.description}
                placeholder="One or two sentences for the blog index and meta description"
                rows={2}
              />
              <RowInput
                name="tags"
                label="Tags"
                defaultValue={(post.tags ?? []).join(", ")}
                placeholder="Comma-separated, e.g. rag, scoping, ai-agents"
              />
              <RowInput
                name="target_keyword"
                label="SEO keyword"
                defaultValue={post.target_keyword}
                placeholder="Primary search keyword"
              />
              <RowInput
                name="hero_image_url"
                label="Hero image URL"
                defaultValue={post.hero_image_url}
                placeholder="Added by the designer routine once unblocked"
              />
              <RowTextarea
                name="linkedin_draft"
                label="LinkedIn draft"
                defaultValue={post.linkedin_draft}
                placeholder="Repurposed LinkedIn post — still copy-pasted by hand"
                rows={4}
                hint={`Status: ${post.linkedin_status ?? "not started"}`}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

function approveLabel(nextStatus: string): string {
  if (nextStatus === "published") return "Publish";
  return `Approve → ${POST_STATUS_LABELS[nextStatus] ?? nextStatus}`;
}

const inputClass =
  "w-full bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--gray-3)]";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-5 py-4 transition-colors focus-within:bg-[var(--cream)]/40">
      <label className="mb-1 block text-[12.5px] font-medium text-[var(--gray-1)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function RowInput({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  placeholder?: string;
}) {
  return (
    <Row label={label}>
      <input
        form={FORM_ID}
        name={name}
        type="text"
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputClass}
      />
    </Row>
  );
}

function RowTextarea({
  name,
  label,
  defaultValue,
  placeholder,
  rows = 3,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <Row label={label}>
      <textarea
        form={FORM_ID}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className={`${inputClass} resize-none leading-relaxed`}
      />
      {hint && <p className="mt-1.5 text-xs text-[var(--gray-2)]">{hint}</p>}
    </Row>
  );
}

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 transition ${
        active
          ? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
          : "text-[var(--gray-2)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
