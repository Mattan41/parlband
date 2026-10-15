# Pages Functions — `functions/api/`

The backend is a set of Cloudflare Pages Functions on the Workers runtime: D1 for
data, R2 for media, no Node server anywhere.

## Structure

- One file per resource: `functions/api/songs.ts`, `functions/api/admin/recordings.ts`, …
- **Pure logic goes in a `*-rules.ts` module next to the route**
  (`functions/api/admin/recording-rules.ts`, `sheet-music-rules.ts`,
  `upload-rules.ts`): validation patterns, key builders, boundary checks. Those
  modules must stay free of Cloudflare globals (`env`, `ctx`) so they are
  unit-testable in the Node Vitest environment; the route imports them.
- Shared helpers live in `functions/api/admin/request.ts` (`readJsonBody`,
  `badRequest`, `errorResponse`). Reuse them instead of inventing another
  response shape.
- Bindings are declared in `wrangler.toml` and typed in `functions/types.d.ts`
  (`DB` = D1, `CDN` = R2). Never hardcode a bucket or database name.

## Behavior rules

- Errors are JSON: an `error` message, plus a machine-readable `code` where the
  UI has to branch (`mp3_missing`, `pdf_invalid`, …). Use the real HTTP status
  (`400`, `401`, `404`, `409`, `413`, `500`).
- Validate before writing: ids, slugs, content types and sizes are checked first,
  so a refused request cannot leave a half-written row or an orphan R2 object.
- Large uploads **stream**: hand `request.body` straight to `R2.put()` instead of
  reading it into memory — the isolate has a 128 MB memory ceiling.
- Admin routes trust the Access JWT verified in
  `functions/api/admin/_middleware.ts`. Never weaken that check to make a route
  work locally; local development is exempted through `NODE_ENV=development`
  **and** a localhost URL in `.dev.vars`.
- Public routes are read-only. Anything that writes lives under
  `functions/api/admin/*` behind Access.
