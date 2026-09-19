# PWA & installability

The site is installable as a standalone app on desktop and mobile and keeps its
app shell available offline. There is **no `next-pwa` dependency**: with the App
Router and a static export, a hand-rolled manifest plus a small service worker is
simpler and more predictable than a plugin's caching heuristics.

## File map

| Piece              | File                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Web app manifest   | `public/manifest.json` – name/short_name `Pärlband`, `start_url: /`, `display: standalone`, `#18181b` theme |
| PWA icons          | `public/icons/icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png`                            |
| Favicon / tab icon | `app/icon.png` (served at `/icon.png`, same render as the 192 px icon)                                      |
| Icon source        | `public/pwa-icon.svg` (vector; every PNG above is rendered from it)                                         |
| Service worker     | `public/sw.js`                                                                                              |
| Registration       | `components/ServiceWorkerRegistrar.tsx`, mounted from `app/layout.tsx`                                      |

## Caching rules

Defined in `public/sw.js`:

- **Cache-first** for the hashed app shell (`/_next/static/*`, icons, manifest).
- **Network-first with a cached fallback** for navigations, so a deploy never
  keeps serving stale HTML while the page still works offline.
- **Never cached:** `/api/*` (dynamic song list and play counts), any
  cross-origin request, and everything served from the R2 CDN
  (`cdn.kruskopf.org`, `/parlband/mp3/`, `/parlband/wav/`, cover images).
  Uploaded audio can be replaced at any time, so the service worker must not
  serve a stale copy – it lets the network (and the browser's own HTTP cache)
  handle those files.

When the precache list or the shell strategy changes, bump `CACHE_NAME` in
`public/sw.js` so old caches are discarded on activate.

## Development vs production

Registration is intentionally skipped when `NODE_ENV !== "production"`, so
`next dev` is never shadowed by cached assets. This means the service worker only
runs against a production build – test with `npm run preview`, not
`npm run dev` / `npm run dev:d1`.

## Testing locally

`localhost` is treated as a secure context, so service workers and the install
prompt work over plain `http://localhost`. A LAN IP (e.g. `http://192.168.1.x`)
is **not** secure, so the worker will not register there – testing on a physical
device needs HTTPS (e.g. a Cloudflare quick tunnel).

```bash
npm run preview   # next build + wrangler pages dev out → http://localhost:8788
```

Then in Chrome DevTools → **Application**:

- **Manifest** – no errors, `Pärlband`, `#18181b`, the icons render crisp.
- **Service Workers** – `/sw.js` activated with scope `/`.
- **Cache Storage** – `parlband-shell-v1` contains `/`, the manifest and icons.
- **Install app** – the install icon appears in the address bar (desktop). On
  iOS there is no prompt: use Share → _Add to Home Screen_.

Confirm playback still works with the worker active: play a song and check that
`cdn.kruskopf.org/parlband/mp3/...` requests are **not** handled by the service
worker in the Network panel.

Offline (tick _Offline_ in the Service Workers panel, then hard-reload) the app
shell loads from cache, but the song list shows
"Kunde inte ladda låtarna just nu." and playback is unavailable – `/api/songs`
and the R2 audio are deliberately network-only. That is expected, not a bug.

While iterating, keep **Update on reload** checked (or unregister and clear site
data between runs) so you do not test against a stale cache.

## Re-rendering the icons

Every PNG is rendered from `public/pwa-icon.svg` with
[sharp](https://sharp.pixelplumbing.com/) (currently available as a transitive
Next.js dependency). Keep the SVG as the single source and re-render after any
change:

```js
const sharp = require("sharp");
const src = "public/pwa-icon.svg";
const rounded = (size) => sharp(src, { density: 72 }).resize(size, size).png();

await rounded(192).toFile("public/icons/icon-192x192.png");
await rounded(512).toFile("public/icons/icon-512x512.png");

// Maskable: flatten onto the background so the rounded corners cannot reveal
// transparency inside Android's mask (full-bleed).
await sharp(src, { density: 72 })
  .resize(512, 512)
  .flatten({ background: "#18181b" })
  .png()
  .toFile("public/icons/icon-maskable-512x512.png");

// Same rounded render as the 192 px icon, reused as the favicon / tab icon.
await rounded(192).toFile("app/icon.png");
```

The glyph occupies x 176–383 / y 136–375 of the 512 px canvas (min edge margin
128 px), placing its furthest corner 174.7 px from the centre – inside Android's
safe radius of 204.8 px (80% of the icon). No extra padding is required.

## Related documentation

- [DATABASE.md](./DATABASE.md) – data flow, CDN URLs and why they are not cached
- [UPLOADING.md](./UPLOADING.md) – R2 file conventions and uploads
- [ADMIN.md](./ADMIN.md) – what you can do in the admin UI
