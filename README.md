# Pärlband

The official website for the band **Pärlband** – music, lyrics and chords.

The site is a Next.js **static export** deployed to Cloudflare Pages. Everything
dynamic is provided by Cloudflare:

- **Pages Functions** (`functions/api/*`) serve the JSON API.
- **D1** (`parlband-db`) stores songs, recordings, credits and play counts.
- **R2** (`kruskopf-cdn`, custom domain `cdn.kruskopf.org`) stores audio, cover
  images and sheet music PDFs.

There is no server-side Next.js runtime: `next build` emits static HTML/CSS/JS into
`out/`, and Pages Functions handle `/api/*`.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, static export)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Zustand](https://zustand.docs.pmnd.rs/) (global player state)
- Cloudflare Pages + Functions + D1 + R2

## Requirements

- Node.js 20+ (developed on Node 24)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`npx wrangler` works too)
- Access to the Cloudflare account that owns the `parlband-db` D1 database and the
  `kruskopf-cdn` R2 bucket (for deploys and remote data changes)

## Getting Started

```bash
npm install
npm run dev:d1
```

`dev:d1` runs `next dev` on port 3000 with `wrangler pages dev` (port 8788)
proxying to it, so the UI **and** `/api/*` Functions work with hot reload.

> Plain `npm run dev` only starts `next dev`. The Functions are not served, so the
> landing page shows "Kunde inte ladda låtarna just nu." instead of the song list.

The local database:

```bash
npm run db:migrate   # apply new files in migrations/ to the local D1 database
npm run db:reset     # wipe local D1, re-apply the schema and seeds.sql
```

## Scripts

| Script               | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Next.js dev server only (no `/api/*`)                 |
| `npm run dev:d1`     | Next.js dev + `wrangler pages dev` proxy (full stack) |
| `npm run build`      | Production static export to `out/`                    |
| `npm run preview`    | `next build` + serve `out/` via `wrangler pages dev`  |
| `npm run start`      | Next.js production server (not used for the deploy)   |
| `npm run db:migrate` | Apply D1 migrations locally                           |
| `npm run db:reset`   | Reset local D1 (schema + `seeds.sql`)                 |
| `npm run lint`       | ESLint (`lint:fix` to autofix)                        |
| `npm run format`     | Prettier (`format:check` to verify)                   |
| `npm run clean`      | Remove `.next`, `dist`, `out`, `build`                |

## Project Structure

```
app/                 App Router routes
  layout.tsx         root layout: fonts, metadata, <StickyPlayer>
  page.tsx           / – fetches /api/songs → <Hero> + <SongList>
  admin/page.tsx     /admin – editor UI (Cloudflare Access)
  robots.ts          /robots.txt (static export)
  sitemap.ts         /sitemap.xml (static export)
components/          shared UI (SongRow, StickyPlayer) + home/ and admin/ features
data/                API types and helpers (songs.ts, admin.ts)
store/               Zustand player state (playerStore.ts)
functions/api/       Pages Functions: songs, plays, admin CRUD + upload
migrations/          versioned D1 schema
docs/                DATABASE.md, UPLOADING.md, ADMIN.md
```

## Routes

| Route    | Description                                                |
| -------- | ---------------------------------------------------------- |
| `/`      | Landing page: hero, welcome card, song list, sticky player |
| `/admin` | Admin/editor UI, protected by Cloudflare Access            |

## Environment

| Variable                     | Used by            | Purpose                                       |
| ---------------------------- | ------------------ | --------------------------------------------- |
| `NEXT_PUBLIC_AUDIO_BASE_URL` | client + Functions | CDN base URL, e.g. `https://cdn.kruskopf.org` |

Cloudflare bindings, declared in `wrangler.toml` and typed in `functions/types.d.ts`:

| Binding | Type | Resource       |
| ------- | ---- | -------------- |
| `DB`    | D1   | `parlband-db`  |
| `CDN`   | R2   | `kruskopf-cdn` |

When deploying through the Cloudflare Pages dashboard, the same bindings must also
be configured under the project's settings.

## Documentation

- [docs/DATABASE.md](docs/DATABASE.md) – schema, API response and data flow
- [docs/UPLOADING.md](docs/UPLOADING.md) – R2 file conventions, CLI uploads, Access
- [docs/ADMIN.md](docs/ADMIN.md) – what you can do in the admin UI

## Deployment

The site deploys as a static site on Cloudflare Pages, which picks up `functions/`
automatically. `/admin*` and `/api/admin*` are protected by Cloudflare Access – both
destinations are required, since protecting only the UI would leave the write
endpoints open. Access runs at the edge and is therefore not enforced by local
`wrangler pages dev` (expected, not a bug).
