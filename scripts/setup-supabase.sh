#!/usr/bin/env bash
# Configure supabase-config.js, push to GitHub, and seed roster data.
# Prerequisites: run supabase/schema.sql, 02-enable-realtime.sql, 03-set-edit-key.sql in Supabase SQL Editor.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${VENDOR_SUPABASE_URL:-}"
ANON="${VENDOR_SUPABASE_ANON:-}"
KEY="${VENDOR_EDIT_KEY:-}"

if [[ -z "$URL" || -z "$ANON" || -z "$KEY" ]]; then
  echo "Usage:"
  echo "  VENDOR_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \\"
  echo "  VENDOR_SUPABASE_ANON=eyJhbG... \\"
  echo "  VENDOR_EDIT_KEY=your-publisher-secret \\"
  echo "  bash scripts/setup-supabase.sh"
  exit 1
fi

cat > supabase-config.js <<EOF
/**
 * Supabase connection (anon URL + key are safe to commit when schema.sql RLS is applied).
 * Set edit_key only in Supabase SQL — never in this file.
 */
window.VENDOR_BOARD_SUPABASE = {
  url: "${URL}",
  anonKey: "${ANON}",
  stateId: "default",
  sheetPollMs: 60000
};
EOF

echo "Wrote supabase-config.js"

node scripts/seed-board.mjs

git add supabase-config.js
git commit -m "Configure Supabase for live vendor board sync" || true
git push origin main

echo ""
echo "Done. Leadership:  https://chakn005.github.io/vendor-resource-board/"
echo "Publisher:       https://chakn005.github.io/vendor-resource-board/?publish=1"
echo "Use the same VENDOR_EDIT_KEY when clicking Publisher key in the browser."
