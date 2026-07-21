#!/usr/bin/env node
/**
 * One-off data migration (NOT a schema migration — run once by hand, after
 * migration 0004 has been applied): insert the existing published post
 * (`scoping-custom-ai-projects.md`) into the new `posts` table as
 * `status = 'published'`, so `src/lib/blog.ts`'s Supabase swap doesn't
 * regress the live site.
 *
 * Run once:
 *   node website/scripts/migrate-published-post-to-supabase.mjs
 *
 * Reads credentials from website/.env.local (same pattern as
 * seed-demo-leads.mjs) and writes with the service-role key. Upserts by
 * slug, so re-running is safe.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const postPath = path.join(
  __dirname,
  "..",
  "src/content/blog/scoping-custom-ai-projects.md"
);

function loadEnvLocal(filePath) {
  const out = {};
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Post is missing frontmatter (expected leading --- block).");
  }
  const [, frontmatter, body] = match;
  const meta = {};
  for (const line of frontmatter.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    meta[key] = value;
  }
  return { meta, body: body.trim() };
}

const env = loadEnvLocal(envPath);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in website/.env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const raw = readFileSync(postPath, "utf8");
  const { meta, body } = parseFrontmatter(raw);

  if (!meta.slug || !meta.title || !meta.date) {
    throw new Error("Post frontmatter is missing slug, title, or date.");
  }

  const row = {
    slug: meta.slug,
    status: "published",
    title: meta.title,
    body_markdown: body,
    description: meta.description ?? "",
    published_at: new Date(meta.date).toISOString(),
  };

  const { error } = await supabase.from("posts").upsert(row, { onConflict: "slug" });
  if (error) throw error;

  console.log(`Migrated "${meta.slug}" into posts as published.`);
}

main().catch((err) => {
  console.error("Failed to migrate published post:", err);
  process.exit(1);
});
