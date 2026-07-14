#!/usr/bin/env node
/**
 * Seed the LIVE Supabase database with realistic, fictional demo leads so
 * the redesigned /admin Leads board isn't empty.
 *
 * IMPORTANT: this is real data meant to stay in the database — not
 * throwaway verification data to clean up afterward. Run once by hand:
 *
 *   node website/scripts/seed-demo-leads.mjs
 *
 * Reads credentials from website/.env.local (same pattern as other ad-hoc
 * scripts against this project) and writes with the service-role key, which
 * bypasses RLS — same access pattern the app's server actions use.
 *
 * Seeds `people` + `contacts` ONLY:
 *   - `activity_log` is NOT seeded — migration 0002 hasn't been run against
 *     this database yet, so the table doesn't exist.
 *   - `orders` is NOT seeded — that's a separate Build 2 item, out of scope.
 *
 * `people` is upserted by email (safe to re-run). `contacts` are inserted
 * only if a row with the same person_id + subject doesn't already exist, so
 * re-running this script after a partial failure won't duplicate rows.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

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

const NOW = Date.now();
const hoursAgo = (n) => new Date(NOW - n * 3600e3).toISOString();
const daysAgo = (n) => new Date(NOW - n * 86400e3).toISOString();

// --- People: 8 distinct contacts. Tom Helder is the repeat-contact demo
// (see the two entries with personKey "tom" in `contacts` below). ---
const people = [
  {
    key: "maya",
    email: "maya@northwindlabs.com",
    name: "Maya Chen",
    company: "Northwind Labs",
    role: "CTO",
    source_site: "jasper-ai",
    ok_to_contact: true,
    created_at: daysAgo(21),
    attributes: {
      how_they_heard: "LinkedIn post on RAG evals",
      company_size: "Startup (2–10)",
      estimated_budget: "$20k–$50k",
    },
  },
  {
    key: "tom",
    email: "tom@heldercapital.com",
    name: "Tom Helder",
    company: "Helder Capital",
    role: "Partner",
    source_site: "jasper-ai",
    ok_to_contact: true,
    created_at: daysAgo(17),
    attributes: {
      how_they_heard: "Referral — Anna K.",
      company_size: "Small Business (11–50)",
      estimated_budget: "Over $50k",
    },
  },
  {
    key: "sofia",
    email: "sofia@brightpath.io",
    name: "Sofia Reyes",
    company: "BrightPath",
    role: "Head of Ops",
    source_site: "jasper-ai",
    ok_to_contact: false,
    created_at: daysAgo(12),
    attributes: {
      how_they_heard: "GitHub — knowledge graph repo",
      company_size: "Medium Business (51–250)",
      estimated_budget: "$5k–$20k",
    },
  },
  {
    key: "jori",
    email: "jjanssen@delta-log.nl",
    name: "Jori Janssen",
    company: "Delta Logistics",
    role: "Innovation Lead",
    source_site: "jasper-ai",
    ok_to_contact: true,
    created_at: daysAgo(9),
    attributes: {
      how_they_heard: "Conference talk",
      company_size: "Enterprise (250+)",
      estimated_budget: "Over $50k",
    },
  },
  {
    key: "priya",
    email: "priya@lumenhealth.co",
    name: "Priya Nair",
    company: "Lumen Health",
    role: "Founder",
    source_site: "jasper-ai",
    ok_to_contact: true,
    created_at: daysAgo(6),
    attributes: {
      how_they_heard: "Personal website",
      company_size: "Startup (2–10)",
      estimated_budget: "$5k–$20k",
    },
  },
  {
    key: "marc",
    email: "marc@atelier-m.fr",
    name: "Marc Dubois",
    company: "Atelier M",
    role: "Owner",
    source_site: "jasper-ai",
    ok_to_contact: false,
    created_at: daysAgo(4),
    attributes: {
      how_they_heard: "Google search",
      company_size: "Solo",
      estimated_budget: "Under $5k",
    },
  },
  {
    key: "lin",
    email: "lin@quantabio.com",
    name: "Lin Zhao",
    company: "Quanta Bio",
    role: "VP Engineering",
    source_site: "jasper-ai",
    ok_to_contact: true,
    created_at: daysAgo(3),
    attributes: {
      how_they_heard: "LinkedIn DM",
      company_size: "Medium Business (51–250)",
      estimated_budget: "$20k–$50k",
    },
  },
  {
    key: "sam",
    email: "sam@ferrostrade.com",
    name: "Sam Okafor",
    company: "Ferros Trade",
    role: "COO",
    source_site: "jasper-ai",
    ok_to_contact: true,
    created_at: hoursAgo(5),
    attributes: {
      how_they_heard: "Referral — Tom Helder",
      company_size: "Small Business (11–50)",
      estimated_budget: "$20k–$50k",
    },
  },
];

// --- Contacts (inquiries), spread across all 6 stages. Timestamps span from
// a few hours ago to ~3 weeks ago so the stale-lead flag (open + no activity
// in 48h+) has real signal: `sam` is fresh, everything else open is stale. ---
const contacts = [
  {
    personKey: "sam",
    type: "ai_development_project",
    subject: "Quote automation agent",
    message:
      "We want an agent that drafts trade quotes from inbound emails and our pricing sheets. Manual quoting eats about three hours a day.",
    source: "website",
    status: "new_lead",
    created_at: hoursAgo(5),
  },
  {
    personKey: "lin",
    type: "ai_consulting",
    subject: "RAG architecture review",
    message:
      "We built a prototype RAG pipeline over research docs but retrieval quality is poor. Need an expert review before we scale it.",
    source: "linkedin",
    status: "new_lead",
    created_at: daysAgo(3),
  },
  {
    personKey: "priya",
    type: "ai_development_project",
    subject: "Patient-intake assistant",
    message:
      "Exploring an LLM assistant that structures patient intake notes for our clinics. Compliance is a key concern.",
    source: "website",
    status: "contacted",
    created_at: daysAgo(5),
  },
  {
    personKey: "marc",
    type: "general_inquiry",
    subject: "Question about pricing",
    message:
      "Do you take on small one-week engagements? I run a solo design studio and want a simple internal chatbot.",
    source: "website",
    status: "contacted",
    created_at: daysAgo(4),
  },
  {
    personKey: "jori",
    type: "ai_consulting",
    subject: "AI roadmap for logistics ops",
    message:
      "Board wants an AI strategy for our routing and customs paperwork. Looking for someone to evaluate use cases and design the architecture.",
    source: "email",
    status: "discovery_call",
    created_at: daysAgo(8),
  },
  {
    personKey: "sofia",
    type: "ongoing_support",
    subject: "Maintain our doc-QA bot",
    message:
      "Our internal doc-QA bot was built by a contractor who left. We need someone on a monthly retainer to maintain and improve it.",
    source: "website",
    status: "proposal",
    created_at: daysAgo(11),
  },
  {
    personKey: "tom",
    type: "ai_development_project",
    subject: "Deal-memo knowledge graph",
    message:
      "We want a knowledge graph over ten years of deal memos with an LLM query layer for our analysts.",
    source: "referral",
    status: "won",
    created_at: daysAgo(16),
  },
  {
    personKey: "maya",
    type: "ai_development_project",
    subject: "Eval harness for support agent",
    message:
      "Need a custom eval harness for our support agent before launch. Timeline was too tight for us this quarter.",
    source: "linkedin",
    status: "lost",
    created_at: daysAgo(20),
  },
  // Repeat contact: Tom Helder reaches out again, separately, after the
  // first engagement shipped — this is the "other inquiries" drawer demo.
  {
    personKey: "tom",
    type: "ongoing_support",
    subject: "Retainer for the deal-memo graph",
    message:
      "Now that the knowledge graph shipped, we'd like an ongoing monthly retainer to keep extending it as new deal memos come in.",
    source: "email",
    status: "contacted",
    created_at: daysAgo(3),
  },
];

async function main() {
  console.log(
    `Seeding ${people.length} people and ${contacts.length} contacts into ${SUPABASE_URL} ...\n`
  );

  const idByKey = {};

  for (const p of people) {
    const { key, ...row } = p;
    const { data, error } = await supabase
      .from("people")
      .upsert(row, { onConflict: "email" })
      .select("id")
      .single();
    if (error) {
      throw new Error(`Failed to upsert person ${p.email}: ${error.message}`);
    }
    idByKey[key] = data.id;
    console.log(`  person  ${p.name.padEnd(16)} -> ${data.id}`);
  }

  console.log("");

  for (const c of contacts) {
    const { personKey, ...row } = c;
    const person_id = idByKey[personKey];

    const { data: existing, error: existingError } = await supabase
      .from("contacts")
      .select("id")
      .eq("person_id", person_id)
      .eq("subject", row.subject)
      .maybeSingle();
    if (existingError) {
      throw new Error(
        `Failed to check for existing contact "${row.subject}": ${existingError.message}`
      );
    }
    if (existing) {
      console.log(`  contact ${row.subject.padEnd(36)} already exists, skipping`);
      continue;
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert({ ...row, person_id })
      .select("id")
      .single();
    if (error) {
      throw new Error(`Failed to insert contact "${row.subject}": ${error.message}`);
    }
    console.log(
      `  contact ${row.subject.padEnd(36)} [${row.status.padEnd(14)}] -> ${data.id}`
    );
  }

  // --- Read back and confirm ---
  const { count: peopleCount, error: peopleCountError } = await supabase
    .from("people")
    .select("*", { count: "exact", head: true });
  if (peopleCountError) throw peopleCountError;

  const { count: contactsCount, error: contactsCountError } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });
  if (contactsCountError) throw contactsCountError;

  const { data: tomContacts, error: tomError } = await supabase
    .from("contacts")
    .select("id, subject, status")
    .eq("person_id", idByKey.tom);
  if (tomError) throw tomError;

  console.log("\nRead-back:");
  console.log(`  people total (whole table):   ${peopleCount}`);
  console.log(`  contacts total (whole table): ${contactsCount}`);
  console.log(
    `  Tom Helder inquiries (${tomContacts.length}): ` +
      tomContacts.map((c) => `"${c.subject}" [${c.status}]`).join(", ")
  );

  if (tomContacts.length !== 2) {
    console.warn(
      "  WARNING: expected exactly 2 inquiries for Tom Helder (the repeat-contact demo)."
    );
  }

  console.log(
    "\nDone. This is real data now sitting in the live database — not test data to clean up."
  );
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
