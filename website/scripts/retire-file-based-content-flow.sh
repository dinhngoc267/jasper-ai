#!/usr/bin/env bash
# Step 6 of content-pipeline-to-supabase: delete the old file-based content
# flow. RUN THIS ONLY AFTER the three data migrations have run against the
# live Supabase project AND /blog is verified to render identically:
#
#   1. Apply migration website/supabase/migrations/0004_content_pipeline_posts.sql
#   2. node website/scripts/migrate-published-post-to-supabase.mjs
#   3. node website/scripts/migrate-backlog-briefs-to-supabase.mjs
#   4. Verify /blog and /blog/scoping-custom-ai-projects render as before,
#      and the 5 backlog briefs appear in /admin/content.
#
# These files are the INPUT to the migration scripts above, so deleting them
# earlier would break the migration. Stage the deletions by name (never
# `git add .`) — this script uses `git rm` which stages each path explicitly.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# The published post's source markdown — now served from the posts table.
git rm website/src/content/blog/scoping-custom-ai-projects.md

# The whole file-based topic backlog (published post files + 5 briefs, now
# migrated into posts as published / brief_pending_review rows).
git rm -r content/topics

echo "Old file-based content flow removed. Review 'git status', then commit."
