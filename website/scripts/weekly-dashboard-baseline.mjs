#!/usr/bin/env node
/**
 * Weekly dashboard baseline + funnel-leak flag (E4.1).
 *
 * Computes, on demand (intended to run on a weekly cadence wired up
 * separately at the Claude-Code-orchestration level — this script has no
 * cron/schedule of its own):
 *
 *   1. Inquiries this week — `contacts` rows created in the trailing 7 days.
 *   2. Per-stage funnel conversion rates — the SAME "furthest stage reached"
 *      algorithm as `buildFunnel()` in `website/src/lib/dashboard.ts`, QA-
 *      verified against direct Supabase queries on 2026-07-16 (see
 *      docs/engineering/changes/2026-07/2026-07-16-admin-dashboard-
 *      verification/QA-REPORT.md). Ported verbatim below rather than
 *      imported: `dashboard.ts` imports the `server-only` marker package,
 *      which unconditionally throws when required outside a React Server
 *      Component bundling context (Next/webpack) — confirmed by testing
 *      `import("server-only")` directly under plain Node, which throws even
 *      though the app itself works fine. The project's own QA verification
 *      pass hit the identical constraint and wrote a fresh standalone
 *      reimplementation rather than importing `dashboard.ts`; this script
 *      follows that same established precedent. If `buildFunnel()` in
 *      `dashboard.ts` ever changes, update `FUNNEL_ORDER` / `RANK` /
 *      `computeFunnel()` below to match, or the two will drift.
 *   3. Funnel-leak flag — whichever stage-to-stage transition has the
 *      largest % drop this run. This is a flag only: deciding what to change
 *      about a leaking stage is a permanent human decision. This script
 *      never fixes, adjusts, or automates a response to the leak it finds.
 *
 * Writes `docs/product/dashboard-baselines/{YYYY-MM-DD}.md`, one file per
 * run — see "Dating convention" in the generated file for why the date is
 * the run date, not the Monday of the ISO week.
 *
 * Run manually:
 *   node website/scripts/weekly-dashboard-baseline.mjs
 *
 * Reads credentials from website/.env.local (same pattern as
 * seed-demo-leads.mjs) and queries with the service-role key. Read-only:
 * every Supabase call in this file is a SELECT.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const BASELINES_DIR = path.join(
  __dirname,
  "..",
  "..",
  "docs",
  "product",
  "dashboard-baselines"
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

const DAY = 24 * 60 * 60 * 1000;

// ── Funnel algorithm — verbatim port of buildFunnel() in
// website/src/lib/dashboard.ts. Keep in sync by hand if that function
// changes; see the file header above for why this can't be a direct import.
const FUNNEL_ORDER = ["new_lead", "contacted", "discovery_call", "proposal", "won"];
const RANK = Object.fromEntries(FUNNEL_ORDER.map((s, i) => [s, i]));
const STATUS_LABELS = {
  new_lead: "New lead",
  contacted: "Contacted",
  discovery_call: "Discovery call",
  proposal: "Proposal",
  won: "Won",
};

function computeFunnel(contacts, activity) {
  const byContact = new Map();
  for (const c of contacts) byContact.set(c.id, [c.status]);
  for (const a of activity) {
    const list = byContact.get(a.contact_id);
    if (!list) continue; // activity for a contact we didn't load — ignore
    list.push(a.to_status);
    if (a.from_status) list.push(a.from_status);
  }

  const counts = FUNNEL_ORDER.map(() => 0);
  for (const statuses of byContact.values()) {
    let furthest = -1;
    for (const s of statuses) {
      const r = RANK[s];
      if (r !== undefined && r > furthest) furthest = r;
    }
    for (let i = 0; i <= furthest; i++) counts[i]++;
  }

  return FUNNEL_ORDER.map((key, i) => ({
    key,
    label: STATUS_LABELS[key],
    count: counts[i],
  }));
}

/** Stage-to-stage % drop for every consecutive pair in the funnel. */
function computeTransitions(funnel) {
  const transitions = [];
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1];
    const cur = funnel[i];
    const dropPct =
      prev.count === 0 ? 0 : Math.round((1 - cur.count / prev.count) * 100);
    transitions.push({ from: prev.label, to: cur.label, dropPct });
  }
  return transitions;
}

function findLeakiest(transitions) {
  const maxDrop = Math.max(...transitions.map((t) => t.dropPct));
  const leakiest = transitions.filter((t) => t.dropPct === maxDrop);
  return { maxDrop, leakiest };
}

function fmtDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Look for the most recent prior weekly log and pull its machine-readable
 * data block (a JSON blob embedded in an HTML comment at the file's end) so
 * comparisons don't depend on scraping human-formatted prose. */
function findPreviousLog(todayFileName) {
  if (!existsSync(BASELINES_DIR)) return null;
  const files = readdirSync(BASELINES_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f) && f !== todayFileName)
    .sort();
  if (files.length === 0) return null;

  const latest = files[files.length - 1];
  const raw = readFileSync(path.join(BASELINES_DIR, latest), "utf8");
  const match = raw.match(/<!-- BASELINE_JSON: (.*) -->/);
  if (!match) return { file: latest, data: null };
  try {
    return { file: latest, data: JSON.parse(match[1]) };
  } catch {
    return { file: latest, data: null };
  }
}

async function main() {
  const now = Date.now();
  const weekStart = now - 7 * DAY;

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, status, created_at");
  if (contactsError) throw contactsError;

  const { data: activity, error: activityError } = await supabase
    .from("activity_log")
    .select("contact_id, from_status, to_status, created_at");
  if (activityError) throw activityError;

  const inquiriesThisWeek = contacts.filter((c) => {
    const t = Date.parse(c.created_at);
    return t >= weekStart && t <= now;
  }).length;

  const funnel = computeFunnel(contacts, activity ?? []);
  const transitions = computeTransitions(funnel);
  const { maxDrop, leakiest } = findLeakiest(transitions);

  const today = fmtDate(now);
  const fileName = `${today}.md`;
  const prev = findPreviousLog(fileName);

  const funnelRows = funnel
    .map((s, i) => {
      const conv = i === 0 ? "—" : `${100 - transitions[i - 1].dropPct}%`;
      return `| ${s.label} | ${s.count} | ${conv} |`;
    })
    .join("\n");

  const leakLine =
    leakiest.length > 1
      ? `Tied at ${maxDrop}% drop across ${leakiest.length} transitions: ` +
        leakiest.map((t) => `${t.from} → ${t.to}`).join(", ") +
        `. Reporting the first in funnel order: **${leakiest[0].from} → ${leakiest[0].to}, ${maxDrop}% dropped**.`
      : `**${leakiest[0].from} → ${leakiest[0].to}, ${maxDrop}% dropped** — the largest stage-to-stage drop this run.`;

  let comparisonSection;
  if (!prev) {
    comparisonSection = "No prior week to compare — this is the first baseline log.";
  } else if (!prev.data) {
    comparisonSection = `Found a previous log (\`${prev.file}\`) but couldn't parse its data block — skipping comparison.`;
  } else {
    const prevInquiries = prev.data.inquiriesThisWeek;
    const diff = inquiriesThisWeek - prevInquiries;
    const diffText = diff === 0 ? "no change" : `${diff > 0 ? "+" : ""}${diff}`;
    comparisonSection =
      `Compared to \`${prev.file}\`: inquiries this week ${prevInquiries} → ${inquiriesThisWeek} (${diffText}). ` +
      `Previous leakiest stage: ${prev.data.leak.from} → ${prev.data.leak.to} (${prev.data.leak.maxDrop}% dropped).`;
  }

  const baselineJson = JSON.stringify({
    date: today,
    inquiriesThisWeek,
    funnel: funnel.map((s) => ({ key: s.key, count: s.count })),
    leak: { from: leakiest[0].from, to: leakiest[0].to, maxDrop },
  });

  const md = `# Weekly Dashboard Baseline — ${today}

**Dating convention:** this file is named and dated by the day the script
*runs*, not the Monday of the ISO week. Chosen because the script currently
runs on demand (a fixed weekly cron cadence is being wired up separately,
outside this task) — "run date" is the unambiguous choice until a fixed
schedule exists. One file per run lives in this folder.

## Inquiries this week
**${inquiriesThisWeek}** contacts created in the trailing 7 days
(${fmtDate(weekStart)} → ${today}) — matches the admin dashboard's own
"week" period definition (\`website/src/lib/period.ts\`: a trailing 7-day
window, not calendar Monday–Sunday).

## Per-stage funnel (all-time, "furthest stage reached")
Same algorithm as the QA-verified admin dashboard funnel
(\`website/src/lib/dashboard.ts\` → \`buildFunnel()\`): each inquiry is
counted at the furthest stage it ever reached (current status plus every
\`activity_log\` from/to status it passed through), cumulative down the
funnel and never double-counted within a stage.

| Stage | Count | Conversion from previous stage |
|---|---|---|
${funnelRows}

## Funnel-leak flag
Leakiest stage-to-stage transition this run: ${leakLine}

**This is a flag, not a fix.** Deciding what to change about a leaking stage
is — and stays — a permanent human judgment call. This script only surfaces
where to look; it never adjusts the pipeline, sends a message, or takes any
remediating action on its own.

## Comparison to previous week
${comparisonSection}

---
<!-- BASELINE_JSON: ${baselineJson} -->
`;

  if (!existsSync(BASELINES_DIR)) mkdirSync(BASELINES_DIR, { recursive: true });
  const outPath = path.join(BASELINES_DIR, fileName);
  writeFileSync(outPath, md, "utf8");

  console.log(`Wrote ${outPath}\n`);
  console.log(`Inquiries this week: ${inquiriesThisWeek}`);
  console.log(`Funnel: ${funnel.map((s) => `${s.key}=${s.count}`).join(", ")}`);
  console.log(
    `Leak: ${leakiest.map((t) => `${t.from}→${t.to}`).join(", ")} (${maxDrop}% dropped)`
  );
}

main().catch((err) => {
  console.error("\nBaseline computation failed:", err);
  process.exit(1);
});
