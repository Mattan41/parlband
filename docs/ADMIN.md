# Admin guide

The admin UI lives at `/admin` and lets the band maintain the whole catalogue
without writing SQL or using the CLI. This document describes **what you can do**
in the UI; for the schema see [DATABASE.md](./DATABASE.md) and for R2/CLI details
see [UPLOADING.md](./UPLOADING.md).

Songs carry an **amber** accent and recordings a **sky (blue)** accent, and only
one song is expanded at a time, so it is always clear what is being edited.
Recordings are a nested accordion under the song, and a collapsed recording row
shows its year/album and status badges.

## Access

Cloudflare Access protects `parlband.kruskopf.org/admin*` **and**
`parlband.kruskopf.org/api/admin*` – two destinations on the same Access
application with the same policy. The second one is essential: protecting only the
UI route would leave the write endpoints open to anyone who finds the URL.

Access runs only at Cloudflare's edge, so local `wrangler pages dev` does not
enforce it (expected, not a bug).

## Access JWT validation (defense in depth)

On top of the edge policy, `functions/api/admin/_middleware.ts` validates the
Access JWT for **every** `/api/admin/*` request, so a misconfigured Access
destination can never leave the write endpoints open:

- The token is read from the `Cf-Access-Jwt-Assertion` header and checked for
  signature, issuer, audience and expiry against
  `https://<CF_ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs` (`jose`,
  `RS256` pinned). `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` come from
  `wrangler.toml` / the Pages project settings.
- Any missing or invalid token returns `401 { "error": "Unauthorized" }` before
  the route runs. The token itself is never logged.
- The verified identity is available to the routes as
  `context.data.access.email`
  (`getAccessIdentity(context.data)?.email`), which is what a route should log to
  record who made a change.
- Locally the check is skipped only when `NODE_ENV=development` **and** the
  request URL is `localhost` (see `.dev.vars.example`). Nothing in a request can
  disable it.

## Songs

- **Create** a song with the **+ Ny låt** button. It opens a modal with a
  short help text: fill in title, artist, `Text av` (lyricist), `Musik av`
  (composer), lyrics text and an optional sheet music path. "Skapa låt" closes
  the modal on success; "Avbryt", Esc or a click outside cancels.
- The **id (slug)** is derived from the title and is used in file names. It may
  only contain `a-z`, `0-9` and hyphens.
- **Edit** any of the fields on an existing song and press "Spara låt".
  Only **one song is expanded at a time** – opening another collapses the
  previous one.
- If a save fails, the error is shown **inside the modal** and everything you
  entered is kept, so it can be corrected without retyping.
- Closing the modal with unsaved input (Esc, click outside, × or Avbryt) asks
  "Du har osparade ändringar. Stäng ändå?" first.
- After a new song is saved it is **expanded automatically**, so uploading notes
  and adding the first recording is the visible next step.
- A song only becomes **public** once it has a recording with an `mp3_path` that
  is also marked **Publik** – `GET /api/songs` filters out songs without one.

## Recordings

A song can have several recordings (e.g. studio + live).

- **Create** a recording with **+ Ny inspelning** inside an expanded song. The
  modal explains the flow: fill in the fields, optionally upload MP3/cover (the
  upload fills in the path for you) and save. "Skapa inspelning" closes the
  modal on success; "Avbryt", Esc or a click outside cancels, and a failed save
  keeps the modal open with your input and shows the error there. Closing
  with unsaved input asks "Du har osparade ändringar. Stäng ändå?" first.
- The **newly created recording is expanded automatically**.
- Recordings are an **accordion**: only one is open per song, and a collapsed
  row shows year, album and the Huvudinspelning/Dold badges so the takes stay
  easy to tell apart.
- Fields: album, studio, year, engineer, notes, mp3 path, wav path, cover path.
- **Publik** (`is_public`): whether the recording may be shown on the site.
  Uncheck it to hide a take (e.g. while re-recording) without deleting it. A
  song whose only recording is hidden stops being playable publicly.
- **Huvudinspelning** (`is_primary`): exactly one per song. Among the **public**
  recordings it is the one the site serves; setting the flag on one clears it on
  the others. It does **not** hide anything by itself – a recording can be
  primary and still hidden, in which case the newest other public recording is
  served instead.
- **Play count** is derived automatically (after 5 s of continuous playback) and is
  never set through the UI.
- **Delete** removes the row and its credits, but leaves the R2 files in the
  bucket. This is intentional: storage is cheap and it avoids accidental data loss.

## Feedback and errors

- All notices are **toasts** fixed at the bottom of the screen, so they stay
  visible wherever you have scrolled. Success messages dismiss themselves;
  errors stay until you close them.
- Feedback that belongs to an open modal or a card (save errors, upload status,
  credits) is shown **inline** there instead – a native dialog sits above
  everything, so a toast would be hidden behind it.
- The initial load retries once automatically. If it still fails you get
  **"Försök igen"**, and when the session has expired (401/403) a distinct
  **"Sessionen har gått ut"** message with **"Ladda om"**. An offline browser and
  an expired session share the same "check the network / sign in again" message.

## File uploads

Upload buttons fill in the matching path field and save it immediately, so no
separate save is needed for the file.

| Button                | Kind    | R2 prefix          | Stored as                               | Limit |
| --------------------- | ------- | ------------------ | --------------------------------------- | ----- |
| Ladda upp MP3         | `mp3`   | `parlband/mp3/`    | `<song-id>.mp3`                         | 25 MB |
| Ladda upp WAV         | `wav`   | `parlband/wav/`    | `<song-id>.wav`                         | 50 MB |
| Ladda upp omslag      | `cover` | `parlband/images/` | `<song-id>.<jpg\|png\|webp\|avif\|gif>` | 10 MB |
| Ladda upp noter (PDF) | `pdf`   | `parlband/pdf/`    | `<song-id>.pdf`                         | 20 MB |

- In the **new recording** modal an upload fills in the path field but cannot
  link the file yet – press "Skapa inspelning" to store the recording.
- MP3, WAV and cover are uploaded from a **recording** card; the PDF from the
  song's **Låtinfo** section.
- Uploading a file with the same name **replaces** the previous object. Because
  objects are cached as immutable, a replaced file may not show up in an open
  player until the page is reloaded. The PWA service worker does not cache these
  CDN files, so it never serves a stale copy – only the browser's own HTTP cache
  is involved.
- **WAV** is served with `content-disposition: attachment` (a download); **MP3**
  streams and **PDF** opens inline in the browser's viewer.
- The PDF is named `<song-id>.pdf` and the song row is updated automatically, so a
  **new song must be saved before its PDF can be uploaded**.
- Notes are **PDF only** (images are not accepted) and there is **exactly one**
  sheet-music document per song. Re-uploading replaces the file in R2 (same key
  `<song-id>.pdf`) and the stored path – it does not add a second document.
- A public download link is planned; for now the band opens the PDF with
  "Öppna noter ↗" above.
- The manual "Noter (R2-sökväg, manuell)" field is still available for setting a
  path by hand.

## Credits

- Credits are attached to a **recording**: a musician plus the instrument they
  played on it.
- Musicians must exist in the `musicians` table; pick one from the credits editor.
- Credits describe the recording, not the song.
- Feedback appears **inline in the recording card** ("Medverkande tillagd"), not
  in a toast.
- Adding a combo that already exists returns `409` and shows "Medverkande finns
  redan på inspelningen." – the existing credit is kept.
- A brand-new musician is created automatically the first time the name is used,
  and the musician dropdown is refreshed immediately, so a later failure cannot
  leave the list stale.

## Musiker

- The **Musiker / Översikt** section below the songs is a read-only view of who
  is registered and where they play. It is derived from the recording credits
  already loaded by the page (no extra API call): each musician is listed with
  their credits grouped by song/recording, and recordings that still have **no**
  credits are listed separately.

## Related documentation

- [DATABASE.md](./DATABASE.md) – tables, API response and data flow
- [UPLOADING.md](./UPLOADING.md) – R2 key conventions, CLI commands, Cloudflare Access
- [PWA.md](./PWA.md) – app install, service worker caching and offline behavior
