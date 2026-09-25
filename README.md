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
- PWA – hand-rolled web app manifest + service worker (installable, offline app shell)
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
| `npm test`           | Vitest unit tests (`test:watch` for watch mode)       |
| `npm run clean`      | Remove `.next`, `dist`, `out`, `build`                |

## Project Structure

```
app/                 App Router routes
  layout.tsx         root layout: fonts, metadata, <StickyPlayer>, SW registration
  page.tsx           / – hero, Kommande spelningar (hidden when empty) and the tracklist
  texter/page.tsx    /texter – lyrics & chords; deep-links via ?song=<id>
  about/page.tsx     /about – "Om oss"; heading + body from GET /api/content
  admin/page.tsx     /admin – catalogue editor (Cloudflare Access)
  admin/gigs/page.tsx      /admin/gigs – gig calendar editor
  admin/about/page.tsx     /admin/about – editor for the welcome text + "Om oss"
  icon.png           app/favicon icon, served at /icon.png (rendered from public/pwa-icon.svg)
  robots.ts          /robots.txt (static export)
  sitemap.ts         /sitemap.xml (static export)
components/          shared UI (PublicShell, SiteNav, StreamingLinks, SongRow, StickyPlayer, TrackSleeve,
                     ServiceWorkerRegistrar, iconButton.ts, songCredits.ts) + home/, about/, texter/, admin/
data/                API types and helpers (songs.ts, gigs.ts, content.ts, admin.ts, siteLinks.ts)
store/               Zustand player state (playerStore.ts)
functions/api/       Pages Functions: songs, plays, downloads, content, gigs, admin CRUD + upload
  admin/_middleware.ts  Cloudflare Access JWT guard for /api/admin/*
public/
  manifest.json      PWA web app manifest
  sw.js              service worker (offline app shell; never caches the R2 CDN)
  icons/             192/512 px PWA icons + maskable variant
  pwa-icon.svg       vector source for the icons
migrations/          versioned D1 schema
tests/               Vitest unit tests (Access JWT guard, gigs, content rules, download URL,
                     musician overview, publication flags, mp3/sheet-music upload rules)
docs/                DATABASE.md, UPLOADING.md, ADMIN.md, PWA.md, PLAYER.md
```

## Routes

| Route          | Description                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `/`            | Hero + Kommande spelningar (no section until a date exists) + tracklist |
| `/texter`      | Lyrics & chords for songs that have lyrics; `?song=<id>` deep links     |
| `/about`       | "Om oss": editable heading + text, streaming links and contact          |
| `/admin`       | Admin/editor UI, protected by Cloudflare Access                         |
| `/admin/gigs`  | Gig calendar editor, protected by Cloudflare Access                     |
| `/admin/about` | Editor for the welcome text and the Om oss page, Cloudflare Access      |

## PWA / installability

The site is installable as a standalone app and keeps its app shell available
offline. There is no `next-pwa` dependency: with the App Router and a static
export, a hand-rolled `public/manifest.json` plus a small `public/sw.js` is
simpler and more predictable than a plugin's caching heuristics. Registration is
handled by `components/ServiceWorkerRegistrar.tsx` (production only).

- **Cache-first** for the hashed app shell (`/_next/static/*`, icons, manifest).
- **Network-first** for navigations, with a cached fallback when offline.
- **Never cached:** `/api/*` and everything from the R2 CDN
  (`cdn.kruskopf.org`, `/parlband/mp3/`, `/parlband/wav/`, cover images), so
  replaced audio is never served stale.

See [docs/PWA.md](docs/PWA.md) for the file map, the local testing checklist, how
to re-render the icons, and how to clear stale state (an old `out/`, the service
worker or `.next`) when a change seems to be missing while verifying a UI tweak.

## Environment

| Variable                     | Used by            | Purpose                                                                                                   |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_AUDIO_BASE_URL` | client + Functions | CDN base URL, e.g. `https://cdn.kruskopf.org`                                                             |
| `CF_ACCESS_TEAM_DOMAIN`      | Functions          | Access team domain, e.g. `https://<team>.cloudflareaccess.com`; normalized and used as the expected `iss` |
| `CF_ACCESS_AUD`              | Functions          | Access Application Audience (AUD) tag protecting `/admin*` + `/api/admin*`                                |
| `NODE_ENV`                   | Functions (local)  | `development` in `.dev.vars` to skip JWT validation locally                                               |

Cloudflare bindings, declared in `wrangler.toml` and typed in `functions/types.d.ts`:

| Binding | Type | Resource       |
| ------- | ---- | -------------- |
| `DB`    | D1   | `parlband-db`  |
| `CDN`   | R2   | `kruskopf-cdn` |

When deploying through the Cloudflare Pages dashboard, the same bindings must also
be configured under the project's settings.

`CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` are set in `wrangler.toml` in **two**
places, because `vars` is a
[non-inheritable key](https://developers.cloudflare.com/pages/functions/wrangler-configuration/#non-inheritable-keys):
the top-level `[vars]` covers local development and preview deployments, and
`[env.production.vars]` covers production. Both carry the same values – there is
only one Access application – and preview needs no `[env.preview]` block.

### Admin API authentication

Cloudflare Access is the primary gate for `/admin*` and `/api/admin*`. As defense
in depth, `functions/api/admin/_middleware.ts` also validates the Access JWT on
every `/api/admin/*` request (all routes in the directory, including
subdirectories):

- Token source: the `Cf-Access-Jwt-Assertion` header.
- Verification: signature, issuer, audience and expiry via
  `createRemoteJWKSet` + `jwtVerify` from [`jose`](https://github.com/panva/jose),
  with `RS256` pinned. JWKS:
  `https://<CF_ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs`.
- On any failure the route never runs and the API returns
  `401 { "error": "Unauthorized" }`. The token is never logged.
- The verified identity is exposed to routes as `context.data.access.email`
  (read it with `getAccessIdentity(context.data)?.email`) so a route can log who
  made a change.

Locally the guard is **skipped** only when both `NODE_ENV=development` and a
`localhost` request URL are present – never because of a request header or query
parameter. Copy `.dev.vars.example` to the git-ignored `.dev.vars` and use
`http://localhost:8788`; a `127.0.0.1` URL is treated as remote and will return
`401`. When `.dev.vars` exists, `wrangler pages dev` no longer loads `.env`, which
is why the example repeats `NEXT_PUBLIC_AUDIO_BASE_URL`.

## Documentation

- [docs/DATABASE.md](docs/DATABASE.md) – schema, API response and data flow
- [docs/UPLOADING.md](docs/UPLOADING.md) – R2 file conventions, CLI uploads, Access
- [docs/ADMIN.md](docs/ADMIN.md) – what you can do in the admin UI
- [docs/PWA.md](docs/PWA.md) – manifest, service worker, install/offline testing
- [docs/PLAYER.md](docs/PLAYER.md) – the sticky player: state, playback and UI rules

## Deployment

The site deploys as a static site on Cloudflare Pages, which picks up `functions/`
automatically. `/admin*` and `/api/admin*` are protected by Cloudflare Access – both
destinations are required, since protecting only the UI would leave the write
endpoints open. Access runs at the edge, so it is not enforced by local
`wrangler pages dev` (expected, not a bug); the app-level JWT check described in
[Admin API authentication](#admin-api-authentication) is skipped there too.

A single Access application covers production and preview deployments, so
`CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` have one set of values. They appear in
both `[vars]` and `[env.production.vars]` in `wrangler.toml`; if the project is
instead configured from the dashboard, set the same two variables for both the
Preview and Production environments there – see
[Environment](#environment).
