# Admin guide

The admin UI lives at `/admin` and lets the band maintain the whole catalogue
without writing SQL or using the CLI. This document describes **what you can do**
in the UI; for the schema see [DATABASE.md](./DATABASE.md) and for R2/CLI details
see [UPLOADING.md](./UPLOADING.md).

Songs carry an **amber** accent and recordings a **sky (blue)** accent, and only
one song is expanded at a time, so it is always clear what is being edited.
Recordings are a nested accordion under the song, and a collapsed recording row
shows its year/album, status badges and both counters.

The admin area has its own top navigation – **Katalog** (`/admin`),
**Spelningar** (`/admin/gigs`) and **Om oss** (`/admin/about`) – rendered on
every admin page (`components/admin/AdminNav.tsx`). It is separate from the
public `components/SiteNav.tsx`, which links the public pages. The public
heading of the gig section is **Kommande spelningar**; the nav pill keeps the
shorter **Spelningar**.

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
- **Delete a song** with **Ta bort låt** in its Låtinfo panel. A song that still
  has recordings is refused (`409`, "Låten har inspelningar – ta bort dem
  först.") – delete its recordings first. Only the `songs` row is removed; R2
  files are left in the bucket.

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
  row shows year, album, the Huvudinspelning/Dold badges, both counters and a
  compact credits summary (e.g. `Mats: Elbas · Nova: Sång`) so the takes stay
  easy to tell apart.
- Fields: album, studio, year, engineer, notes, mp3 path, wav path, cover path.
- **MP3 required:** a recording cannot be saved unless its `mp3_path` points at
  an **object that exists in R2** (the server checks with `CDN.head`). A new
  recording starts with an **empty** mp3 path – upload the file (or, for legacy
  material, point at an existing object). A missing file shows a Swedish inline
  error ("MP3-filen finns inte i R2 …"), while editing other fields on an old
  recording with an unchanged `mp3_path` still saves.
- **Publik** (`is_public`): whether the recording may be shown on the site.
  Uncheck it to hide a take (e.g. while re-recording) without deleting it. A
  song whose only recording is hidden stops being playable publicly.
- **Huvudinspelning** (`is_primary`): exactly one per song. Among the **public**
  recordings it is the one the site serves; setting the flag on one clears it on
  the others. It does **not** hide anything by itself – a recording can be
  primary and still hidden, in which case the newest other public recording is
  served instead.
- **Play count** is derived automatically (after 5 s of continuous playback) and is
  never set through the UI. **Downloads** are counted when a visitor uses the
  download link (`GET /api/downloads`), which redirects to the WAV; neither
  counter can be edited by hand.
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

| Button                | Kind    | R2 prefix          | Stored as                                       | Limit |
| --------------------- | ------- | ------------------ | ----------------------------------------------- | ----- |
| Ladda upp MP3         | `mp3`   | `parlband/mp3/`    | `<song-id>-<8 hex>.mp3`                         | 25 MB |
| Ladda upp WAV         | `wav`   | `parlband/wav/`    | `<song-id>-<8 hex>.wav`                         | 50 MB |
| Ladda upp omslag      | `cover` | `parlband/images/` | `<song-id>-<8 hex>.<jpg\|png\|webp\|avif\|gif>` | 10 MB |
| Ladda upp noter (PDF) | `pdf`   | `parlband/pdf/`    | `<song-id>.pdf`                                 | 20 MB |

- In the **new recording** modal an upload fills in the path field but cannot
  link the file yet – press "Skapa inspelning" to store the recording.
- MP3, WAV and cover are uploaded from a **recording** card; the PDF from the
  song's **Låtinfo** section.
- MP3/WAV/cover uploads get a **unique name per upload**, so a second
  recording of the same song never overwrites the first recording's file. Old
  objects are left behind when you re-upload (orphans in the bucket).
- The **PDF** keeps its stable `<song-id>.pdf` key and is replaced on re-upload,
  which is why it is served with `cache-control: no-cache` instead of the
  `immutable` used for audio/cover.
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

## Spelningar ("Kommande spelningar")

- **Katalog | Spelningar | Om oss** in the admin nav; **Spelningar** opens
  `/admin/gigs`, the gig calendar.
- **+ Nytt datum** creates a date in a modal (date and venue required; title,
  time, city, ticket link, info and internal notes are optional). A failed save
  keeps the modal open with your input and shows the error there; closing with
  unsaved input asks "Du har osparade ändringar. Stäng ändå?" first.
- **Enter never saves.** Only the **Spara**/**Skapa datum** button submits; a
  stray keypress in a field (e.g. the venue) can no longer commit a half-written
  date. Inside the multi-line fields Enter inserts a line break, as expected.
- **Titel** is the gig's own name (e.g. a festival) and makes a date easy to
  recognise in the list. It is optional and **is shown on the public site** when
  filled in.
- **Tid** is typed as text in strict 24-hour form (`19:00`, never AM/PM – the
  native time picker was dropped because it follows the browser's locale and
  shows AM/PM on an en-US machine). `9:05` is tidied to `09:05` when the field
  loses focus; a value the API cannot parse is refused with Swedish copy.
- **Info** is a multi-line field: the line breaks are kept and rendered as rows
  on the landing page.
- **Interna anteckningar** are for the band only. They are stored and shown in
  the admin (a row with a note carries a small **Anteckning** badge) but the
  public `GET /api/gigs` never selects the column, so they cannot appear on the
  site.
- Existing dates are an accordion: one row is open at a time, and the collapsed
  row shows the Swedish date (e.g. `sön 4 okt. 2026`), the time, the title, the
  venue and whether it has passed.
- Dates from **today and later** are what the landing page shows; a gig that has
  passed stays in the list with a **Passerat** badge but is no longer public.
- A venue is required and a ticket link must be an `http(s)` URL, otherwise the
  save is refused. The API returns an English message **and** a stable code
  (`venue_required`, `ticket_url_invalid`, …); `GigsSection` maps the code to
  Swedish copy, so what you see in the UI is always Swedish.
- **As long as the list is empty the landing page renders no "Kommande
  spelningar" section at all** – there is no empty state on the public site.

## Om oss

- **Om oss** in the admin nav opens `/admin/about`, which edits all editable
  public copy in one form:
  - **Välkomsttext (startsidan)** – the line under the band members in the
    landing-page hero (`site_content.welcome_text`). An emptied field hides the
    line completely.
  - **Rubrik (Om oss-sidan)** – the heading of `/about`
    (`site_content.about_heading`). An emptied field falls back to the built-in
    "Om oss", which is also what the nav link says.
  - **Text (Om oss-sidan)** – the body of `/about` (`site_content.about_body`).
- One **Spara texterna** button saves all three keys; it is disabled until
  something actually changed.
- The copy is rendered as plain text (line breaks are preserved, no markdown).
  The body sits above the streaming links, which are static.
- The page `<title>` is fixed to "Om oss – Pärlband" (the static export cannot
  read the heading at build time) and the public nav label is hardcoded, so
  neither changes with the heading.
- **Visa sidan ↗** opens the public page in a new tab. Saving shows an inline
  confirmation.
- The public page also lives at `/about`; it is linked from the public nav, so no
  admin change is needed for visitors to find it.

## Credits

- Credits are attached to a **recording**: a musician plus the instrument they
  played on it.
- Musicians must exist in the `musicians` table; pick one from the credits editor.
- Credits describe the recording, not the song.
- The credits editor is its **own bordered block** with the note
  "Sparas direkt – du behöver inte trycka Spara": **Lägg till**/**Ta bort** save
  immediately, while **Spara** only applies to the recording fields above it.
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
- **+ Ny musiker** in that section adds a name through `POST /api/admin/musicians`
  with inline feedback and refreshes the list without a page reload. The endpoint
  is idempotent (case-insensitive), so an already-registered name is reused
  rather than duplicated.
- **Byt namn** renames a musician (`PUT /api/admin/musicians`) with the note
  "Namnet ändras på alla inspelningar.". A name already used by **another**
  musician is refused with a Swedish message (Swedish-aware comparison, so
  "Örjan" and "örjan" collide); changing only the case of the same
  musician's own name is allowed.

## Implementation note

Never nest one `<form>` inside another in the admin UI. A nested form is invalid,
so the browser does not route its submit through React and falls back to a native
GET submit – the page navigates to `/admin?` and reloads, losing all state. Each
editor owns its own form: the recording fields/actions are one form, and the
credits editor (and every other sub-editor) sits next to it, not inside it.

## Related documentation

- [DATABASE.md](./DATABASE.md) – tables, API response and data flow
- [UPLOADING.md](./UPLOADING.md) – R2 key conventions, CLI commands, Cloudflare Access
- [PWA.md](./PWA.md) – app install, service worker caching and offline behavior
