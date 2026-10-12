# Configuration, auth & deployment

How the app is configured (environment variables and Cloudflare bindings), how the
admin API is protected, and how it deploys. For the data model see
[DATABASE.md](./DATABASE.md), for the admin UI see [ADMIN.md](./ADMIN.md) and for
R2 file conventions see [UPLOADING.md](./UPLOADING.md).

## Environment variables

| Variable                     | Used by            | Purpose                                                                                                   | Where set                                                               |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_AUDIO_BASE_URL` | client + Functions | CDN base URL, e.g. `https://cdn.kruskopf.org`                                                             | `wrangler.toml` `[vars]` + `[env.production.vars]`; `.dev.vars` locally |
| `CF_ACCESS_TEAM_DOMAIN`      | Functions          | Access team domain, e.g. `https://<team>.cloudflareaccess.com`; normalized and used as the expected `iss` | `wrangler.toml` `[vars]` + `[env.production.vars]`                      |
| `CF_ACCESS_AUD`              | Functions          | Access Application Audience (AUD) tag protecting `/admin*` + `/api/admin*`                                | `wrangler.toml` `[vars]` + `[env.production.vars]`                      |
| `NODE_ENV`                   | Functions (local)  | `development` in `.dev.vars` to skip JWT validation locally                                               | `.dev.vars` only (never set in a deployed environment)                  |

`.dev.vars.example` is the template; copy it to the git-ignored `.dev.vars` for
local `wrangler pages dev`. When `.dev.vars` exists, `wrangler pages dev` no
longer loads `.env`, which is why the example repeats `NEXT_PUBLIC_AUDIO_BASE_URL`.

`CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` are set in `wrangler.toml` in **two**
places, because `vars` is a
[non-inheritable key](https://developers.cloudflare.com/pages/functions/wrangler-configuration/#non-inheritable-keys):
the top-level `[vars]` covers local development and preview deployments, and
`[env.production.vars]` covers production. Both carry the same values – there is
only one Access application – and preview needs no `[env.preview]` block. If the
project is instead configured from the Cloudflare Pages dashboard, set the same
variables for both the Preview and Production environments there.

## Cloudflare bindings

Declared in `wrangler.toml` and typed in `functions/types.d.ts`:

| Binding | Type | Resource       |
| ------- | ---- | -------------- |
| `DB`    | D1   | `parlband-db`  |
| `CDN`   | R2   | `kruskopf-cdn` |

`database_id` is committed in `wrangler.toml` (see [DATABASE.md](./DATABASE.md)).
When deploying through the Cloudflare Pages dashboard, the same bindings must also
be configured under the project's settings.

## Admin API authentication

Cloudflare Access is the primary gate for `/admin*` and `/api/admin*` at the edge.
As defense in depth, `functions/api/admin/_middleware.ts` also validates the Access
JWT on every `/api/admin/*` request (all routes in the directory, including
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
`401`.

See [ADMIN.md → Access JWT validation](./ADMIN.md#access-jwt-validation-defense-in-depth)
for the admin-UI view of the same guard, and
[ARCHITECTURE.md → Auth boundary](./ARCHITECTURE.md#auth-boundary) for why the
public endpoints stay open.

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
[Environment variables](#environment-variables).
