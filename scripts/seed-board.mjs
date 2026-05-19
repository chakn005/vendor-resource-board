#!/usr/bin/env node
/**
 * One-time seed: publish vendor-data.js to Supabase for all viewers.
 * Usage:
 *   VENDOR_SUPABASE_URL=https://xxx.supabase.co \
 *   VENDOR_SUPABASE_ANON=eyJ... \
 *   VENDOR_EDIT_KEY=your-publisher-secret \
 *   node scripts/seed-board.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = (process.env.VENDOR_SUPABASE_URL || "").trim();
const anonKey = (process.env.VENDOR_SUPABASE_ANON || "").trim();
const editKey = (process.env.VENDOR_EDIT_KEY || "").trim();

if (!url || !anonKey || !editKey) {
  console.error("Set VENDOR_SUPABASE_URL, VENDOR_SUPABASE_ANON, and VENDOR_EDIT_KEY");
  process.exit(1);
}

const raw = readFileSync(join(root, "vendor-data.js"), "utf8");
const match = raw.match(/window\.VENDOR_BOARD_INITIAL_DATA\s*=\s*(\[[\s\S]*\]);/);
if (!match) {
  console.error("Could not parse vendor-data.js");
  process.exit(1);
}

const data = JSON.parse(match[1]);
const body = {
  v: 1,
  data,
  meta: {
    source: "seed",
    fileName: "vendor-data.js",
    syncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/publish_vendor_board_state`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    p_id: "default",
    p_state: body,
    p_edit_key: editKey
  })
});

if (!res.ok) {
  const text = await res.text();
  console.error("Publish failed:", res.status, text);
  process.exit(1);
}

const ts = await res.json();
console.log(`Published ${data.length} rows. updated_at: ${ts}`);
