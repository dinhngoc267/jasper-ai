#!/usr/bin/env node
/**
 * Review-needed email notification for the content pipeline.
 *
 * Sent by the standalone routine scripts (channel-signal / writer /
 * linkedin-repurpose) right after they transition a `posts` row into a
 * `*_pending_review` status — matching the TECH-PLAN's chosen mechanism
 * ("the automation script sending the email itself right after the Supabase
 * write", rather than a DB trigger/webhook, since the automations already run
 * standalone with the service-role key).
 *
 * Reuses the same Resend sandbox setup as the app (`app/actions/contact.ts`
 * and the daily digest cron): from `onboarding@resend.dev`, to the account's
 * own verified address `jasper.le@edge8.ai`, until jasper-ai.com is bought
 * and verified as a sending domain.
 *
 * Importable:
 *   import { notifyReviewNeeded } from "./notify-review-needed.mjs";
 *   await notifyReviewNeeded({ id, title, slug, stage });
 *
 * Or standalone (handy for verification — sends a test notification):
 *   node website/scripts/notify-review-needed.mjs <post-id> <stage> [title]
 *
 * Reads RESEND_API_KEY (and NEXT_PUBLIC_SITE_URL for the deep link) from
 * website/.env.local, same loader as the other scripts.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";

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
    // Fall back to process.env when there's no .env.local (e.g. running in a
    // scheduled context that injects env vars directly).
  }
  return out;
}

/** Human-readable label for each review-needed stage, used in the subject. */
const STAGE_LABELS = {
  pending_review: "post",
  // LinkedIn draft uses its own `linkedin_status`, not the post `status`.
  linkedin_pending_review: "LinkedIn draft",
};

function siteUrl(env) {
  return (
    env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://jasper-ai-neon.vercel.app"
  );
}

/**
 * Send one review-needed notification. Best-effort: logs and returns
 * `{ sent: false }` on any failure (missing key, Resend error) rather than
 * throwing, so a notification hiccup never fails the routine's actual write.
 *
 * @param {{ id: string, title?: string, slug?: string, stage: string }} post
 */
export async function notifyReviewNeeded({ id, title, slug, stage }) {
  const env = loadEnvLocal(envPath);
  const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[notify-review-needed] RESEND_API_KEY not set — skipping email.");
    return { sent: false };
  }

  const stageLabel = STAGE_LABELS[stage] ?? "item";
  const link = `${siteUrl(env)}/admin/content/${id}`;
  const displayTitle = title || slug || id;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "jasper.le@edge8.ai",
      subject: `Review needed: ${stageLabel} — ${displayTitle}`,
      html: `
        <p>A ${stageLabel} is ready for your review.</p>
        <p><strong>${displayTitle}</strong>${slug ? ` <code>/${slug}</code>` : ""}</p>
        <p><a href="${link}">Open it in /admin/content →</a></p>
        <p style="color:#86868b;font-size:12px">
          Approve or reject it there — no PR or deploy needed.
        </p>
      `,
    });
    if (error) throw error;
    return { sent: true };
  } catch (err) {
    console.error("[notify-review-needed] failed to send email:", err);
    return { sent: false };
  }
}

// Standalone invocation: node notify-review-needed.mjs <id> <stage> [title]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , id, stage, title] = process.argv;
  if (!id || !stage) {
    console.error("Usage: node notify-review-needed.mjs <post-id> <stage> [title]");
    process.exit(1);
  }
  notifyReviewNeeded({ id, stage, title }).then((r) => {
    console.log(r.sent ? "Sent." : "Not sent (see warnings above).");
  });
}
