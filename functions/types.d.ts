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
}
