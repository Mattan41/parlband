# Project Guidelines — Pärlband

Band website for **Pärlband**: a Next.js static export served from Cloudflare
Pages, with Cloudflare Pages Functions + D1 + R2 as the only backend. Live at
<https://parlband.kruskopf.org>.

## Read first

- `README.md` — stack, scripts, folder map, routes.
- `docs/ARCHITECTURE.md` — the _why_ behind the structure (static export instead
  of a Next.js server, `/`, `/texter` and `/about` as one SPA route so the player
  keeps its state). Do not undo those decisions by accident.
- The feature doc that owns the area you touch, e.g. `docs/ADMIN.md`,
  `docs/UPLOADING.md`, `docs/DATABASE.md`, `docs/PLAYER.md`, `docs/PWA.md`,
  `docs/CONFIGURATION.md`.

## Non-negotiables

- **Static export.** `next.config.ts` uses `output: "export"`; there is no
  Next.js server at runtime, so anything dynamic belongs in `functions/api/*`
  (Pages Functions), never in a route handler or a server action.
- **Documentation moves with the behavior.** When behavior, a route, an API
  response or a limit changes, update the doc that describes it in the same
  change (`docs/ADMIN.md` + `docs/UPLOADING.md` for uploads, `docs/DATABASE.md`
  for the schema and API, `docs/CONFIGURATION.md` for env vars and bindings).
- **Language:** code, comments, docs and commit messages are English. Swedish is
  only for user-facing copy in the UI (labels, toasts, headings).
- **Secrets never enter the repo.** `.dev.vars` and `.env*` are git-ignored; only
  `.dev.vars.example` is committed, with placeholders.
- **No new dependency for what the platform already provides:** the service
  worker and manifest are hand-rolled, Zustand is the only state library, data
  access goes through the plain `fetch` helpers in `data/`.
- **Git:** the human commits, never the assistant. Subjects are short, lowercase
  and imperative (`add recording view for admin`,
  `raise admin audio upload limits to 95 mb`), optionally `type(scope): ...`.

## Cloudflare specifics worth remembering

- A request body is capped at **100 MB** on the Free and Pro plans (200 MB on
  Business, up to 5 GB on Enterprise) and is refused with `413` at the edge
  _before_ the Function runs, so app-level limits stay below it — see
  `functions/api/admin/upload-rules.ts`.
- Media lives in R2 (`kruskopf-cdn`, prefix `parlband/`) and is served from
  `cdn.kruskopf.org`; metadata lives in D1 (`parlband-db`) — see
  `docs/UPLOADING.md` and `docs/DATABASE.md`.
- `/admin*` and `/api/admin*` are protected by Cloudflare Access **and** the JWT
  check in `functions/api/admin/_middleware.ts`; keep both destinations on the
  same Access application.
