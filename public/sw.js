/*
 * Minimal service worker for the Pärlband static export.
 *
 * Strategy:
 * - Cache-first for the hashed app shell (Next.js `/_next/static/*`, icons,
 *   manifest). These files are content-addressed and safe to serve from cache.
 * - Network-first for navigations (HTML), falling back to the cached shell when
 *   offline, so a deploy never keeps serving stale HTML.
 * - The R2 CDN (audio, WAV downloads, cover images) and the dynamic JSON API are
 *   never cached: those change independently of the app shell and must not be
 *   served stale.
 *
 * Bump CACHE_NAME when the precache list or shell changes.
 */
const CACHE_NAME = "parlband-shell-v1";

/** App shell files that must be available offline. */
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
];

/** R2 paths that must never be cached (streaming MP3s and WAV downloads). */
const BLOCKED_PATH_PREFIXES = ["/parlband/mp3/", "/parlband/wav/"];

/** R2 host serving audio and cover images; never cache anything from it. */
const BLOCKED_HOSTS = ["cdn.kruskopf.org"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET requests are cacheable.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch cross-origin requests (audio and covers come from the R2 CDN).
  if (url.origin !== self.location.origin) return;

  // Belt-and-braces: skip the CDN host and the R2 audio/download paths.
  if (BLOCKED_HOSTS.includes(url.host)) return;
  if (BLOCKED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  // Dynamic API responses (song list, play counts) must always be fresh.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first with a cached-shell fallback for offline use.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Static app shell: cache-first, then fill the cache on first miss.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
