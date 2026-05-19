# Supabase setup (one-time)

## 1. Create project

1. https://supabase.com/dashboard → **New project**
2. Note **Project URL** and **anon public** key (Settings → API)

## 2. Run SQL (SQL Editor → New query)

Run in order, replacing `YOUR_PUBLISHER_SECRET` in step 3 with a long random string:

```bash
openssl rand -base64 32
```

| File | Purpose |
|------|---------|
| [`schema.sql`](schema.sql) | Tables + RLS + publish RPC |
| [`02-enable-realtime.sql`](02-enable-realtime.sql) | Live updates for viewers |
| [`03-set-edit-key.sql`](03-set-edit-key.sql) | Set `YOUR_PUBLISHER_SECRET` |

## 3. Configure site + seed data

From the repo root:

```bash
VENDOR_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
VENDOR_SUPABASE_ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
VENDOR_EDIT_KEY='same-secret-as-step-3' \
bash scripts/setup-supabase.sh
```

This updates `supabase-config.js`, pushes to GitHub Pages, and publishes the roster from `vendor-data.js`.

## 4. Browser publish (optional)

https://chakn005.github.io/vendor-resource-board/?publish=1

- **Publisher key** = same secret as step 3
- Upload `.xlsx` or **Sync now** from Google Sheets

Leadership URL (read-only): https://chakn005.github.io/vendor-resource-board/
