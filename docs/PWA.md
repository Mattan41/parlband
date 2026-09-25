# PWA & installability

The site is installable as a standalone app on desktop and mobile and keeps its
app shell available offline. There is **no `next-pwa` dependency**: with the App
Router and a static export, a hand-rolled manifest plus a small service worker is
simpler and more predictable than a plugin's caching heuristics.

## File map

| Piece              | File                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app manifest   | `public/manifest.json` – name/short_name `Pärlband`, `start_url: /`, `display: standalone`, `#18181b` theme, self-referencing `related_applications` |
| PWA icons          | `public/icons/icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png`                                                                     |
| Favicon / tab icon | `app/icon.png` (served at `/icon.png`, same render as the 192 px icon)                                                                               |
| Icon source        | `public/pwa-icon.svg` (vector; every PNG above is rendered from it)                                                                                  |
| Service worker     | `public/sw.js`                                                                                                                                       |
| Registration       | `components/ServiceWorkerRegistrar.tsx`, mounted from `app/layout.tsx`                                                                               |

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

## Clearing stale state when verifying a change

Three different servers can show you the same source, and they do not refresh at
the same time. If a change seems to be missing – or DevTools shows markup that
looks like the previous version – check which one you are actually looking at:

| URL / command             | What is served                                   | What can be stale                    |
| ------------------------- | ------------------------------------------------ | ------------------------------------ |
| `npm run dev` (:3000)     | plain `next dev`, **no `/api/songs`**            | the `.next` cache                    |
| `npm run dev:d1` (:8788)  | fresh dev server proxied through the Functions   | `.wrangler/tmp/*` (Functions bundle) |
| `npm run preview` (:8788) | the static `out/` from the **last `next build`** | `out/`, plus the service worker      |

```bash
npm run clean           # removes .next, dist, out and build
rm -rf .wrangler/tmp    # forces Functions to be re-bundled (keeps local D1!)
npm run dev:d1          # or: npm run preview, which builds first
```

Then in Chrome DevTools:

- **Network** – tick _Disable cache_ (applies while DevTools is open) and reload
  with `Ctrl/Cmd+Shift+R`, or right-click the reload button → _Empty Cache and
  Hard Reload_.
- **Application → Service Workers** – tick _Update on reload_ or _Unregister_.
  The worker only runs against a production build, so this matters for `preview`
  and deploys, never for `dev`/`dev:d1`.
- **Application → Storage → Clear site data** – drops the `parlband-shell-*`
  caches.
- A private/incognito window is the quickest way to be sure nothing is cached.

> **Do not** run `rm -rf .wrangler` or `npm run db:reset` "to clear the cache":
> that deletes the local D1 database, so the song list comes up empty and looks
> like a bug. `db:reset` is only for rebuilding the database from `seeds.sql`.

After an HMR update React can briefly leave detached or duplicated nodes in the
tree (for example an old `fixed` player bar). Do a full reload before judging
whether the markup is really wrong.

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

## Install prompt on /about

`components/about/InstallAppCard.tsx` ("Spara som app") turns the installability
into something a visitor can act on from the Om oss page. It stays hidden when
`window.matchMedia("(display-mode: standalone)")` matches or iOS Safari reports
`navigator.standalone`, so it is never offered to someone who already has the app
open as an installed app.

On Chromium (Android, desktop Chrome/Edge) the card captures
`beforeinstallprompt` and replays it from an "Installera app" button. Because
that event is also suppressed once the app is installed – which would otherwise
leave a plain browser tab falling through to the generic "use the browser menu"
hint – the hint is deliberately withheld on Chromium until the prompt proves the
app can be installed from here.

`navigator.getInstalledRelatedApps()` is queried once per page session as an
authoritative second opinion, so an already-installed device stays hidden even in
a normal tab. For that query to see anything the manifest has to opt in:

```json
"id": "/",
"related_applications": [
  {
    "platform": "webapp",
    "id": "/",
    "url": "https://parlband.kruskopf.org/manifest.json"
  }
]
```

`getInstalledRelatedApps()` is Chromium-only and experimental, which is why the
Chromium hint is withheld rather than trusted on its own. Firefox and desktop
Safari keep the browser-menu hint, and iOS keeps the Share → _Lägg till på
hemskärmen_ steps (iOS never fires `beforeinstallprompt`). An unsupported browser
or a rejected query degrades to the previous behaviour. The detection is kept in
the pure `components/about/installApp.ts` helpers and unit-tested in
`tests/install-app.test.ts`.

To verify on a real install: install the app, then reopen
`https://parlband.kruskopf.org/about` in a normal tab – the card must not appear.
DevTools → **Application → Manifest** shows the parsed `related_applications`,
and `await navigator.getInstalledRelatedApps()` in the console should list the
`webapp` entry on a device that has it installed.

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
- [PLAYER.md](./PLAYER.md) – the sticky player: state, playback and UI rules
