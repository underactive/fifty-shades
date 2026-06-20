# Filament Workshop

A visual inventory of my 3D-printing filament. Every spool is a reel resting on a
wooden shelf — one shelf per material (PLA, PETG, TPU…) — and the reels are sorted
left→right in **ROYGBIV** order so I can see my colors at a glance.

- **Public to view, PIN to edit.** Anyone can browse; adding/changing/deleting spools
  requires an edit PIN.
- **Stored as one JSON document** in Upstash Redis (key `filament:inventory:v1`).
- **Hosted on Netlify** — a static Astro site plus a single serverless function.

## Stack

| Layer        | Tech |
|--------------|------|
| Site         | Astro 6 (static output) |
| Interactivity| Vue 3 island (`src/components/ShelfWall.vue`) |
| Styling      | Tailwind v4 + a hand-written workshop theme (`src/styles/global.css`) |
| Backend      | One Netlify Function (`netlify/functions/inventory.js`) |
| Storage      | Upstash Redis via its REST API |

## Local development

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
```

Two ways to run it:

- **UI only** (no data persistence): `npm run dev` → http://localhost:4321
  The shelves call `/api/inventory`, which only exists under Netlify, so you'll see the
  "couldn't load" state. Good enough for styling work.
- **Full stack** (recommended): `npx netlify dev` → http://localhost:8888
  Runs Astro *and* the function together, with your `.env` loaded. This is the real thing.

### Environment variables (`.env`)

```
UPSTASH_REDIS_REST_URL=...     # Upstash console → your DB → "REST API"
UPSTASH_REDIS_REST_TOKEN=...
EDIT_PIN=...                    # any secret string; required to save edits
PUBLIC_SITE_URL=https://fiftyshades.esison.dev
```

Create a database at <https://console.upstash.com/>, open the **REST API** tab, and copy
the URL + token. These are the same variable names used by `esison.dev-astro`.

## Deploy (Netlify)

1. Connect the repo. Build settings come from `netlify.toml` (`npm run build` → `dist`,
   functions in `netlify/functions`).
2. In **Site settings → Environment variables**, add `UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`, and `EDIT_PIN`.
3. Deploy. The `/api/inventory` redirect maps to the function automatically.

> If `EDIT_PIN` is not set, **all writes are refused** (the app is read-only) — fail-closed
> by design.

## API

`GET /api/inventory` → the full document (public).
`PUT /api/inventory` with header `x-edit-pin: <PIN>` and body `{ "spools": [...] }` →
validates and overwrites the document; returns the stored doc. The PIN is compared in
constant time and never leaves the server.

Quick checks against a running `netlify dev`:

```bash
curl -s localhost:8888/api/inventory                       # read
curl -s -X PUT localhost:8888/api/inventory \              # 401 (no PIN)
  -H 'content-type: application/json' -d '{"spools":[]}'
curl -s -X PUT localhost:8888/api/inventory \              # 200
  -H 'content-type: application/json' -H 'x-edit-pin: YOURPIN' -d '{"spools":[]}'
```

## Data

One record per filament SKU:

```jsonc
{
  "id": "uuid",
  "name": "Galaxy Black",
  "manufacturer": "Prusament",
  "type": "PLA",
  "color": { "name": "Galaxy Black", "hex": "#1b1b2a" },
  "temps": { "nozzleMin": 215, "nozzleMax": 225, "bed": 60 },
  "count": 3,
  "diameter": 1.75,
  "weightGrams": 1000,
  "purchase": { "vendor": "Prusa", "date": "2026-01-02", "price": 29.99, "currency": "USD" },
  "storage": "Drybox A",
  "notes": "low stringing"
}
```

Use the **Export / Import** buttons in the toolbar to download or restore the whole
document as JSON — a one-click backup.

Material presets (shelf order + default temps) live in `src/lib/materials.ts`; the
color/ROYGBIV logic lives in `src/lib/colors.ts`.

## Tests

```bash
npm test        # vitest — color conversion + ROYGBIV ordering
```
