# Vendor Resource Board 2026

Leadership-facing vendor roster with live org-wide sync from uploaded spreadsheets or Google Sheets.

## Features

- **KPI summary** — headcount, Beqisoft/Zucitech, availability, CapEx/Opex, alliances
- **Sortable, filterable table** with row detail drawer
- **Analytics** — vendor, alliance, timezone, funding, QE manager
- **Live badge** when connected to Supabase (realtime updates for all viewers)

## URLs to share

| Audience | URL |
|----------|-----|
| **Leadership / management** | https://chakn005.github.io/vendor-resource-board/ |
| **Publishers** (upload sheet) | https://chakn005.github.io/vendor-resource-board/?publish=1 |

## Setup

### 1. Supabase

1. Create a [Supabase](https://supabase.com) project (dedicated to this board).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
3. Replace `CHANGE_ME_TO_A_LONG_RANDOM_SECRET` in `vendor_board_config.edit_key`.
4. Enable **Realtime** for `vendor_board_state` (Database → Publications).
5. Copy **Project URL** and **anon public** key into [`supabase-config.js`](supabase-config.js).

### 2. GitHub Pages

```bash
# Create repo on GitHub: vendor-resource-board (public)
cd vendor-resource-board
git init
git add .
git commit -m "Initial vendor resource board"
git branch -M main
git remote add origin https://github.com/chakn005/vendor-resource-board.git
git push -u origin main
```

In the repo: **Settings → Pages → Build and deployment → GitHub Actions**.

After deploy (~2 min), share the leadership URL above.

### 3. Publish data

1. Open `/?publish=1` on your deployed site.
2. Click **Publisher key** and enter your Supabase `edit_key`.
3. Upload `.xlsx` / `.csv` or paste a Google Sheets link (viewable by link) and **Sync now**.

Everyone opening the leadership URL sees updates automatically via Realtime.

## Local development

```bash
python3 -m http.server 8000
# http://localhost:8000/
# Publisher: http://localhost:8000/?publish=1
```

No build step — React + Babel load from CDN.

## Security

- Never commit real Supabase keys if using a private project policy; anon key + RLS is designed for public read.
- `edit_key` lives only in Supabase and the publisher’s browser session (`sessionStorage`).
