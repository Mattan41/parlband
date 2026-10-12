# Pärlband

The official website for the band **Pärlband** – songs, lyrics, chords and gigs,
built as a Next.js static export and served from Cloudflare Pages.

**Live:** <https://parlband.kruskopf.org>

## Status

Hobby / portfolio project. It is the band's real public site **and** a deliberate
exercise to sharpen React + Next.js skills for the job market, so it is under
active development – copy, features and the admin tooling still change. There are
no user accounts: the public side is read-only, and the admin tools are gated by
Cloudflare Access.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, `output: "export"`) + React 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Zustand](https://zustand.docs.pmnd.rs/) for the global player state
- PWA – hand-rolled web app manifest + service worker (installable, offline app shell)
- Backend – Cloudflare Pages Functions + D1 (database) + R2 (media); no Next.js server
- Tooling – Vitest, ESLint + Prettier

## Features

- **Player** – a sticky, app-wide audio player (a single `<audio>` element), a
  queue, a track sleeve with credits, and automatic play counting after 5 s.
- **Texter / ackord** – lyrics and chords per song, with a chord/text mode switch.
- **Lyssna** – the song list with cover art, streaming links and a WAV download
  (click-counted).
- **Spelningar** – upcoming gigs; the block hides itself while the calendar is empty.
- **Om oss** – editable band copy, contact address and streaming links.
- **Admin** – catalogue, gig and copy editors at `/admin*`, behind Cloudflare Access.
- **PWA** – installable on desktop and mobile, with an offline app shell.
- **Static export** – the whole front end ships as static HTML/CSS/JS; everything
  dynamic comes from the `/api/*` Functions.

## Getting started

Requires **Node.js 20+** (developed on Node 24) and access to the Cloudflare
account that owns the `parlband-db` D1 database and the `kruskopf-cdn` R2 bucket
(for deploys and remote data changes). [`npx wrangler`](https://developers.cloudflare.com/workers/wrangler/)
serves the local API.

```bash
npm install
npm run dev:d1
```

`dev:d1` runs `next dev` (port 3000) with `wrangler pages dev` (port 8788)
proxying to it, so the UI **and** the `/api/*` Functions both work with hot
reload. This is the mode to use for everyday development.

> Plain `npm run dev` starts only `next dev` – the Functions are not served, so the
> landing page shows "Kunde inte ladda låtarna just nu." instead of the song list.

To exercise a production build (and the service worker, which is skipped outside
production), use:

```bash
npm run preview   # next build + wrangler pages dev out
```

The local database is versioned and seeded through Wrangler:

```bash
npm run db:migrate   # apply new files in migrations/ to the local D1 database
npm run db:reset     # wipe local D1, re-apply the schema + seeds.sql
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

## Configuration

Copy `.dev.vars.example` to the git-ignored `.dev.vars` before running the
Functions locally.

| Variable                     | Used by            | Purpose                                                             |
| ---------------------------- | ------------------ | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_AUDIO_BASE_URL` | client + Functions | CDN base URL, e.g. `https://cdn.kruskopf.org`                       |
| `CF_ACCESS_TEAM_DOMAIN`      | Functions          | Access team domain; normalized and used as the expected `iss` claim |
| `CF_ACCESS_AUD`              | Functions          | Access Audience (AUD) tag for `/admin*` + `/api/admin*`             |
| `NODE_ENV`                   | Functions (local)  | `development` in `.dev.vars` to skip JWT validation locally         |

Cloudflare bindings, declared in `wrangler.toml` and typed in `functions/types.d.ts`:

| Binding | Type | Resource       |
| ------- | ---- | -------------- |
| `DB`    | D1   | `parlband-db`  |
| `CDN`   | R2   | `kruskopf-cdn` |

Where each value is set, how `wrangler.toml` handles `vars` across preview and
production, how the admin Access JWT is validated, and how the site deploys are all
covered in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Project structure

```
app/            App Router routes – / (public SPA), /admin*, robots, sitemap
components/     UI, grouped by view (home/, about/, texter/) + shared + admin/
data/           typed API shapes + fetch helpers, one file per resource
store/          Zustand player state
functions/api/  Cloudflare Pages Functions – the actual backend
public/         static assets + the PWA shell (manifest.json, sw.js, icons/)
migrations/     versioned D1 schema
tests/          Vitest unit tests
docs/           feature documentation (see below)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full folder map and the
decisions behind it.

## Documentation

| Doc                                       | Covers                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)   | Structural decisions: static export, the single-route SPA, folder layout, where state lives |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables, Cloudflare bindings, admin Access/JWT auth and deployment            |
| [DATABASE.md](docs/DATABASE.md)           | D1 schema, API responses and data flow                                                      |
| [ADMIN.md](docs/ADMIN.md)                 | What you can do in the admin UI                                                             |
| [UPLOADING.md](docs/UPLOADING.md)         | R2 file conventions, CLI uploads, Access                                                    |
| [PLAYER.md](docs/PLAYER.md)               | The sticky player: state, playback and UI rules                                             |
| [PWA.md](docs/PWA.md)                     | Manifest, service worker, install/offline testing                                           |
