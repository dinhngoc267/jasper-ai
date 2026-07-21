#!/usr/bin/env node
/**
 * posts-cli — the content pipeline's read/write bridge to the `posts` table.
 *
 * Replaces the old git-file + PR mechanism: the local routines
 * (content-brief-weekly / writer-weekly / linkedin-repurpose-weekly) call
 * these subcommands to move a piece of content through its lifecycle in
 * Supabase instead of committing brief.md + blog.md under content/topics and
 * opening a PR. Each write into a pending-review stage also fires the
 * review-needed email (see notify-review-needed.mjs), so the operator gets a
 * link straight to /admin/content/{id}.
 *
 * Reads credentials from website/.env.local with the service-role key (same
 * access pattern as channel-signal.mjs / seed-demo-leads.mjs).
 *
 * Subcommands:
 *   list [--status <status>] [--linkedin-missing]
 *       Print matching posts as a JSON array (id, slug, title, status,
 *       linkedin_status, published_at, created_at), newest first. With
 *       --linkedin-missing, only published posts whose linkedin_status is
 *       still unset (the linkedin routine's "what's left to repurpose").
 *
 *   create-post <post.json>
 *       Insert a COMPLETE blog post (the weekly routine writes the whole
 *       thing in one shot) as `pending_review`, from a JSON file:
 *       { slug (req), title, body_markdown (the full article), description,
 *       tags[], target_keyword, source_channel, source_confidence }.
 *       Prints { id, slug }. Notifies the operator to review it.
 *
 *   save-linkedin <linkedin.json>
 *       For an existing row (matched by slug), write linkedin_draft and set
 *       linkedin_status = pending_review. Notifies.
 *
 * Examples:
 *   node scripts/posts-cli.mjs list --status pending_review
 *   node scripts/posts-cli.mjs create-post /tmp/post.json
 *   node scripts/posts-cli.mjs save-linkedin /tmp/linkedin.json
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { notifyReviewNeeded } from "./notify-review-needed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnvLocal(filePath) {
  const out = {};
  try {
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    // Fall back to process.env if there's no .env.local.
  }
  return out;
}

function getClient() {
  const env = loadEnvLocal(envPath);
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in website/.env.local"
    );
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readJson(filePath) {
  if (!filePath) {
    console.error("Expected a path to a JSON file as the argument.");
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Couldn't read/parse JSON at ${filePath}:`, err.message);
    process.exit(1);
  }
}

function flag(args, name) {
  return args.includes(name);
}
function opt(args, name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

async function cmdList(supabase, args) {
  const status = opt(args, "--status");
  const linkedinMissing = flag(args, "--linkedin-missing");

  let query = supabase
    .from("posts")
    .select("id, slug, title, status, linkedin_status, published_at, created_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (linkedinMissing) query = query.eq("status", "published").is("linkedin_status", null);

  const { data, error } = await query;
  if (error) throw error;
  console.log(JSON.stringify(data ?? [], null, 2));
}

async function cmdCreatePost(supabase, args) {
  const post = readJson(args[0]);
  if (!post.slug || !post.title || !post.body_markdown) {
    console.error("Post JSON must include `slug`, `title`, and `body_markdown`.");
    process.exit(1);
  }

  const row = {
    slug: post.slug,
    status: "pending_review",
    title: post.title,
    body_markdown: post.body_markdown,
    description: post.description ?? null,
    tags: post.tags ?? null,
    target_keyword: post.target_keyword ?? null,
    source_channel: post.source_channel ?? null,
    source_confidence: post.source_confidence ?? null,
  };

  const { data, error } = await supabase
    .from("posts")
    .insert(row)
    .select("id, slug, title")
    .single();
  if (error) throw error;

  await notifyReviewNeeded({
    id: data.id,
    title: data.title,
    slug: data.slug,
    stage: "pending_review",
  });

  console.log(JSON.stringify({ id: data.id, slug: data.slug }, null, 2));
}

async function cmdSaveLinkedin(supabase, args) {
  const li = readJson(args[0]);
  if (!li.slug || !li.linkedin_draft) {
    console.error("LinkedIn JSON must include `slug` and `linkedin_draft`.");
    process.exit(1);
  }

  const { data: existing, error: findErr } = await supabase
    .from("posts")
    .select("id, slug")
    .eq("slug", li.slug)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existing) {
    console.error(`No post found with slug "${li.slug}".`);
    process.exit(1);
  }

  const { data, error } = await supabase
    .from("posts")
    .update({
      linkedin_draft: li.linkedin_draft,
      linkedin_status: "pending_review",
    })
    .eq("id", existing.id)
    .select("id, slug, title")
    .single();
  if (error) throw error;

  await notifyReviewNeeded({
    id: data.id,
    title: data.title,
    slug: data.slug,
    stage: "linkedin_pending_review",
  });

  console.log(JSON.stringify({ id: data.id, slug: data.slug }, null, 2));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const supabase = getClient();

  switch (command) {
    case "list":
      return cmdList(supabase, args);
    case "create-post":
      return cmdCreatePost(supabase, args);
    case "save-linkedin":
      return cmdSaveLinkedin(supabase, args);
    default:
      console.error("Usage: posts-cli.mjs <list|create-post|save-linkedin> [...]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("posts-cli failed:", err);
  process.exit(1);
});
