/**
 * Shared bindings for all Pages Functions.
 *
 * Declared once in `functions/types.d.ts` (the path Cloudflare documents for
 * Pages types) so every endpoint can use `PagesFunction<Env>` without repeating
 * the interface. The files under `functions/api/` that predate this file keep
 * their own local `interface Env`, which simply shadows this one.
 */
interface Env {
  /** D1 database holding songs, recordings, musicians and credits. */
  DB: D1Database;
  /** R2 bucket `kruskopf-cdn`; all files live under the `parlband/` prefix. */
  CDN: R2Bucket;
  /** Public CDN base URL, e.g. https://cdn.kruskopf.org (from [vars]). */
  NEXT_PUBLIC_AUDIO_BASE_URL?: string;
  /**
   * Cloudflare Access team domain, e.g. https://knishopf.cloudflareaccess.com
   * (from [vars]). The Access guard normalizes it and uses it as the expected
   * `iss` claim and as the base of the JWKS URL.
   */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** Cloudflare Access Application Audience (AUD) tag of the admin application. */
  CF_ACCESS_AUD?: string;
  /**
   * `development` only for local `wrangler pages dev`; never set in a deployed
   * environment. Together with a `localhost` request URL it is the single
   * signal that lets the admin Access guard be skipped.
   */
  NODE_ENV?: string;
}
