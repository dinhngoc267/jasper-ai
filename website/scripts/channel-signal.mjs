#!/usr/bin/env node
/**
 * Channel signal + channel→content-strategy mapping (E4.3).
 *
 * Reads the live "how did you hear about me" breakdown from Supabase
 * (`people.attributes->>how_they_heard`), decides which acquisition channel is
 * currently producing the most leads, and emits a recommended content strategy
 * tuned to that channel. Consumed by the `content-brief-weekly` routine
 * (`website/scripts/E4.3-content-brief-routine.SKILL.md`) to PROPOSE — via a
 * PR, never an auto-queue drop — a channel-biased content brief for the
 * writer → designer → web-publisher pipeline.
 *
 * Read-only: the only Supabase call here is a SELECT. This script decides
 * nothing on its own beyond what to *propose*; a human merging the brief PR
 * gates everything downstream.
 *
 * Honesty rules (mirrors the honest-tie / thin-data handling in
 * `weekly-dashboard-baseline.mjs`):
 *   - Tie for #1 → report the tie, don't silently pick one.
 *   - Under ~10 classified leads, or a top-vs-#2 margin of ≤1 → flag the
 *     signal as weak/low-confidence and fall back to evergreen positioning.
 *   - Never overstate a signal that isn't in the data.
 *
 * Why this reimplements the group-by instead of importing dashboard.ts:
 * `website/src/lib/dashboard.ts` imports the `server-only` marker package,
 * which throws under plain Node (outside a React Server Component bundle) —
 * confirmed and documented in `weekly-dashboard-baseline.mjs`. The group-by is
 * trivial, so it's reimplemented standalone here (same shape as
 * `buildSources()` in dashboard.ts). If `buildSources()` ever changes, keep
 * `buildBreakdown()` below in sync.
 *
 * Run manually:
 *   node website/scripts/channel-signal.mjs
 *
 * Reads credentials from website/.env.local with the service-role key (same
 * access pattern as weekly-dashboard-baseline.mjs / seed-demo-leads.mjs).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

// ── Thresholds (operator-tunable) ─────────────────────────────────────────────
// Below THIN_DATA classified leads the sample is too small to trust; a top-vs-#2
// gap at or below MIN_MARGIN is too close to call. Both trigger a low-confidence
// verdict and an evergreen fallback. Tune these as real lead volume grows.
const THIN_DATA = 10;
const MIN_MARGIN = 2;

// ── Channel → content-strategy mapping (OPERATOR-TUNABLE) ─────────────────────
// This is a content-strategy decision, deliberately kept as an explicit,
// editable table rather than buried in prose. Edit these freely — format,
// angle, and keywordApproach are the levers. `match` is the list of lowercase
// substrings used to normalize a raw `how_they_heard` value onto a canonical
// channel (see normalizeChannel below). "Fallback" is the evergreen default
// used whenever the signal is weak, tied, or the top value maps to no known
// channel — do NOT force a channel angle when the data doesn't support one.
const CHANNEL_STRATEGY = {
  Referral: {
    match: ["referral", "refer", "word of mouth", "friend", "colleague"],
    format: "Results / case-study-style post a referrer can forward.",
    angle:
      "Concrete outcome + social proof: a real (or representative) engagement, the problem, what shipped, the measurable result — framed so a happy contact can send it to someone who asked 'who built that?'.",
    keywordApproach:
      "Low keyword pressure; optimize for shareability and skimmability over search. Name the outcome in the title (e.g. a metric) rather than a keyword.",
  },
  LinkedIn: {
    match: ["linkedin", "linked in"],
    format: "Opinion / thought-leadership / contrarian-take post.",
    angle:
      "A defensible point of view aimed at a professional audience — take a stance most in the field would hesitate to state plainly, back it with reasoning and a concrete example, and make it quotable/excerptable for a LinkedIn post.",
    keywordApproach:
      "Keyword is secondary to the take. Target the phrasing a peer would use in a professional feed, not a search box.",
  },
  Search: {
    match: ["search", "google", "seo", "bing", "web search"],
    format: "SEO how-to guide targeting one specific keyword.",
    angle:
      "Answer one concrete question an ICP founder would type into Google, end to end. Practical, complete, better than what currently ranks — earns the click and the dwell time.",
    keywordApproach:
      "Pick ONE primary long-tail keyword an ICP founder would search (e.g. 'how to scope an AI agent project'); put it in the title, first 100 words, and ≥2 H2s.",
  },
  GitHub: {
    match: ["github", "git hub", "open source", "oss", "repo"],
    format: "Technical deep-dive / implementation walkthrough.",
    angle:
      "Show the work: real code, architecture diagrams, or a concrete build walkthrough a technical reader can follow and evaluate. Earn credibility with an engineering audience by being specific and correct, not hand-wavy.",
    keywordApproach:
      "Target the technical term / library / pattern name the reader would search (e.g. 'RAG evaluation pipeline'). Precision over volume.",
  },
  Event: {
    match: ["event", "conference", "meetup", "talk", "webinar", "workshop"],
    format: "Recap / follow-up content tied to a talk-style topic.",
    angle:
      "Extend a talk-shaped topic into a written follow-up: the argument someone would have heard live, expanded with the detail a session runs out of time for. Give event-met leads a reason to re-engage.",
    keywordApproach:
      "Keyword is tertiary; target the topic/talk title phrasing. Optimize for the follow-up read, not cold search.",
  },
  Website: {
    // The dashboard's combined "Website / blog" bucket.
    match: ["website", "web site", "blog", "personal site", "personal website"],
    format: "Topic-cluster content that deepens an existing theme.",
    angle:
      "Compounding SEO: pick an existing on-site theme and go one level deeper, interlinking with what's already published so the cluster gains authority over time. Builds on visitors who already found the site.",
    keywordApproach:
      "Target a supporting keyword in the same cluster as an existing post; interlink both ways to compound topical authority.",
  },
  Fallback: {
    // Not matched against raw values — selected when signal is weak/tied/unknown.
    match: [],
    format: "Evergreen positioning post.",
    angle:
      "The strongest evergreen positioning topic for Jasper AI — 'AI systems that ship': how fixed-scope AI development, consulting, and retainers de-risk building AI for founders. Channel-neutral by design; used precisely because the data doesn't justify a channel angle right now.",
    keywordApproach:
      "Target a broad evergreen ICP keyword (e.g. 'hire an AI developer' / 'fixed-scope AI project'). Positioning first, keyword second.",
  },
};

// ── env loader (verbatim pattern from weekly-dashboard-baseline.mjs) ──────────
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

/**
 * How-they-heard breakdown across ALL people. Same shape/semantics as
 * buildSources() in dashboard.ts: group by the raw `how_they_heard` value,
 * ignore empty/unset, sort most-common first. Ties are broken alphabetically
 * so runs are deterministic (the tie itself is reported separately).
 */
function buildBreakdown(people) {
  const counts = new Map();
  for (const p of people) {
    const label = p.attributes?.how_they_heard?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Map a raw how_they_heard value onto a canonical CHANNEL_STRATEGY key. */
function normalizeChannel(rawLabel) {
  const l = rawLabel.toLowerCase();
  for (const [key, entry] of Object.entries(CHANNEL_STRATEGY)) {
    if (entry.match.some((m) => l.includes(m))) return key;
  }
  return null; // maps to no known channel → treated as unknown → Fallback
}

/**
 * Decide the signal from a ranked breakdown. Returns the top raw channel, its
 * normalized key, the runner-up, the margin, a tie flag, and an honest
 * confidence verdict. Weak/tie/unknown all resolve the recommended strategy to
 * Fallback rather than forcing a channel angle.
 */
function decideSignal(breakdown) {
  const totalClassified = breakdown.reduce((s, r) => s + r.count, 0);

  if (breakdown.length === 0) {
    return {
      totalClassified: 0,
      top: null,
      runnerUp: null,
      margin: null,
      tie: false,
      tiedLabels: [],
      confidence: "weak",
      confidenceNote:
        "No classified how_they_heard data at all — cannot detect a channel. Falling back to evergreen positioning.",
      recommendedChannelKey: "Fallback",
    };
  }

  const maxCount = breakdown[0].count;
  const tiedLabels = breakdown.filter((r) => r.count === maxCount).map((r) => r.label);
  const tie = tiedLabels.length > 1;
  const top = breakdown[0];
  const runnerUp = breakdown[1] ?? null;
  const margin = runnerUp ? top.count - runnerUp.count : null;
  const normalizedKey = normalizeChannel(top.label);

  let confidence = "strong";
  const notes = [];
  if (totalClassified < THIN_DATA) {
    confidence = "weak";
    notes.push(
      `only ${totalClassified} classified lead(s) (< ${THIN_DATA}) — sample too small to trust`
    );
  }
  if (tie) {
    confidence = "tie";
    notes.push(
      `#1 is a ${tiedLabels.length}-way tie at ${maxCount} (${tiedLabels.join(", ")})`
    );
  } else if (margin !== null && margin < MIN_MARGIN) {
    if (confidence === "strong") confidence = "weak";
    notes.push(
      `top leads #2 by only ${margin} (< ${MIN_MARGIN}) — too close to call`
    );
  }
  if (!normalizedKey && confidence === "strong") {
    confidence = "weak";
    notes.push(
      `top value "${top.label}" maps to no known channel — no channel angle justified`
    );
  }

  const useChannel =
    confidence === "strong" && normalizedKey ? normalizedKey : "Fallback";

  return {
    totalClassified,
    top: { ...top, normalizedKey },
    runnerUp,
    margin,
    tie,
    tiedLabels,
    confidence,
    confidenceNote:
      notes.length > 0
        ? notes.join("; ") + "."
        : `Clear leader: "${top.label}" at ${top.count}` +
          (runnerUp ? `, ahead of "${runnerUp.label}" by ${margin}.` : " (only classified channel)."),
    recommendedChannelKey: useChannel,
  };
}

async function main() {
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

  const { data: people, error } = await supabase
    .from("people")
    .select("attributes");
  if (error) throw error;

  const totalPeople = people.length;
  const breakdown = buildBreakdown(people);
  const signal = decideSignal(breakdown);
  const strategy = CHANNEL_STRATEGY[signal.recommendedChannelKey];

  // ── Human-readable output ───────────────────────────────────────────────────
  const CONF_ICON = { strong: "STRONG", weak: "WEAK — low confidence", tie: "TIE — low confidence" };
  console.log("Channel signal — how_they_heard breakdown (all people)");
  console.log("=".repeat(64));
  console.log(
    `People total: ${totalPeople} · classified: ${signal.totalClassified} · unclassified: ${
      totalPeople - signal.totalClassified
    }\n`
  );

  if (breakdown.length === 0) {
    console.log("(no classified how_they_heard values)\n");
  } else {
    console.log("Ranked channels (most common first):");
    for (const [i, r] of breakdown.entries()) {
      const norm = normalizeChannel(r.label);
      console.log(
        `  ${i + 1}. ${r.label} — ${r.count}${norm ? `  [${norm}]` : "  [unmapped]"}`
      );
    }
    console.log("");
  }

  if (signal.tie) {
    console.log(`Top channel: TIE — ${signal.tiedLabels.join(", ")} (each ${breakdown[0].count})`);
  } else if (signal.top) {
    console.log(
      `Top channel: ${signal.top.label} (${signal.top.count})${
        signal.top.normalizedKey ? ` → ${signal.top.normalizedKey}` : " → unmapped"
      }`
    );
  }
  console.log(`Confidence: ${CONF_ICON[signal.confidence]}`);
  console.log(`Note: ${signal.confidenceNote}\n`);

  console.log(`Recommended content strategy → ${signal.recommendedChannelKey}`);
  console.log(`  Format:   ${strategy.format}`);
  console.log(`  Angle:    ${strategy.angle}`);
  console.log(`  Keywords: ${strategy.keywordApproach}\n`);

  // ── Machine-readable blob (consumed by the content-brief-weekly routine) ──────
  const json = {
    generatedAt: new Date().toISOString(),
    totalPeople,
    totalClassified: signal.totalClassified,
    breakdown,
    topChannel: signal.tie
      ? null
      : signal.top
      ? { label: signal.top.label, count: signal.top.count, normalizedKey: signal.top.normalizedKey }
      : null,
    tie: signal.tie,
    tiedLabels: signal.tiedLabels,
    runnerUp: signal.runnerUp,
    margin: signal.margin,
    confidence: signal.confidence,
    confidenceNote: signal.confidenceNote,
    recommendedChannelKey: signal.recommendedChannelKey,
    strategy: {
      format: strategy.format,
      angle: strategy.angle,
      keywordApproach: strategy.keywordApproach,
    },
  };
  console.log(`<!-- CHANNEL_SIGNAL_JSON: ${JSON.stringify(json)} -->`);
}

main().catch((err) => {
  console.error("\nChannel-signal computation failed:", err);
  process.exit(1);
});
