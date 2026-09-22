# Database & data flow (Cloudflare D1)

All song data comes from the D1 database `parlband-db`. It is read by a Pages
Function and sent as JSON to the frontend – there is no static song list in the
code.

## Data flow

```
D1 (parlband-db)
  └─ functions/api/songs.ts   GET /api/songs   (raw rows + nested credits)
       └─ data/songs.ts       toSong(): row → Song + helper URLs
            └─ app/page.tsx   fetches /api/songs on mount → <SongRow> list
                 └─ store/playerStore.ts  global playback state (Zustand)
                      └─ components/StickyPlayer.tsx  single <audio> element
                           └─ functions/api/plays.ts  POST /api/plays
                                (StickyPlayer increments recordings.play_count
                                 after 5 s of continuous playback)
                 └─ components/SongRow.tsx  download link
                      └─ functions/api/downloads.ts  GET /api/downloads
                           (increments recordings.download_count, then redirects
                            to the WAV in R2)
  └─ functions/api/content.ts GET /api/content (site_content → editable page copy)
       ├─ components/home/Hero.tsx     welcome line on the landing page
       └─ components/about/AboutView.tsx  heading + body on /about
  └─ functions/api/gigs.ts    GET /api/gigs    (upcoming gigs)
       └─ components/home/GigList.tsx  "Kommande spelningar"; renders nothing when empty
  └─ functions/api/admin/*    /api/admin/*   (CRUD + R2 uploads: mp3/wav/cover/pdf)
       ├─ app/admin/page.tsx         catalogue UI (protected by Cloudflare Access)
       ├─ app/admin/gigs/page.tsx   gig calendar (/api/admin/gigs)
       └─ app/admin/about/page.tsx   page-copy editor (PUT /api/admin/content)
```

The D1 binding is defined in `wrangler.toml` and is named `DB`. The R2 bucket
that holds all files is bound as `CDN`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "parlband-db"
database_id = "b685ab25-61b7-4ebe-bc25-6a22bd8b2b99"

[[r2_buckets]]
binding = "CDN"
bucket_name = "kruskopf-cdn"
```

Both bindings are shared by every Pages Function through the `Env` interface in
`functions/types.d.ts`. When deploying through the Cloudflare Pages dashboard
instead of Wrangler, the same bindings must also exist under the project's
settings.

## Tables

- **songs** – The abstract musical work.
  - `id`: Slug/ID (e.g. 'fri').
  - `title`: Song title.
  - `artist`: Main artist/band (e.g. 'Pärlband').
  - `lyrics_by`: Lyricist.
  - `music_by`: Composer.
  - `lyrics`: The lyrics themselves (plain text with line breaks).
  - `sheet_music_path`: Relative path to sheet music as a PDF in R2 (optional; a
    single document per song, uploaded from the admin UI).
  - `is_published`: `1` when the song may be shown on the site, `0` when it is a
    draft. **Public `GET /api/songs` only returns published songs**, and `/texter`
    reads the same endpoint, so a draft disappears from the lyrics/chords view
    too; `GET /api/admin/songs` returns every song. Independent of
    `recordings.is_public`/`is_primary` – a song must be published **and** have a
    public recording to be playable. Added in
    `0009_songs_gigs_is_published.sql`.

- **recordings** – A specific recorded version of a song.
  - `id`: Autoincrement, `song_id` → `songs.id`.
  - `album`, `studio`, `year`, `engineer`, `notes`: Technical metadata.
  - `mp3_path`, `wav_path`, `cover_path`: File names in R2 (see [UPLOADING.md](./UPLOADING.md)).
    `mp3_path` must point at an object that actually exists in the bucket – the
    admin API refuses to save a recording whose mp3 is missing (see below).
  - `play_count`: Number of plays. Derived counter – never set through the admin
    API.
  - `download_count`: Number of WAV downloads. Derived counter – never set
    through the admin API (and not returned for hidden recordings).
  - `is_primary`: `1` for the recording the public API serves when a song has
    several **public** recordings (e.g. studio + live). It only breaks ties among
    the public ones; the admin API keeps exactly one primary per song.
  - `is_public`: `1` when the recording may be shown on the site, `0` when it is
    hidden (e.g. a work-in-progress take). Independent of `is_primary`:
    unchecking `is_primary` does not hide a recording, and a song whose only
    recording is hidden is served without a playable file.

- **musicians** – Registry of contributing musicians (`id`, `name`).

- **recording_credits** – Join table for who played which instrument on a given recording (`recording_id`, `musician_id`, `instrument`).

- **site_content** – Editable site copy as `key`/`value`:
  `welcome_text` (the welcome line under the band members on the landing page),
  `about_heading` and `about_body` (the heading and free text on `/about`). All
  three are edited at `/admin/about`; the key/value shape keeps the schema stable
  when more editable copy is added.

- **gigs** – The gig calendar ("Kommande spelningar"), edited at `/admin/gigs`.
  - `event_date`: ISO date (`YYYY-MM-DD`, text). `GET /api/gigs` only returns
    today and later **in `Europe/Stockholm`** (the route binds the Swedish date
    instead of SQLite's UTC `date('now')`, so a gig stays visible until 23:59:59
    local time), so past gigs disappear from the site on their own while staying
    in the admin; the admin also relies on the ISO form for the "Passerat" badge.
  - `start_time`: optional 24-hour time (`HH:MM`).
  - `title`: optional name of the gig itself (e.g. a festival). Shown in the
    admin list and, when set, as the leading label on the landing page.
  - `venue`: required, e.g. a stage or a festival name.
  - `city`, `ticket_url`, `info`: optional (the URL must be `http(s)`). `info` is
    public copy and its line breaks are preserved.
  - `internal_notes`: optional notes for the band only. **Never returned by the
    public `GET /api/gigs`** – only `GET /api/admin/gigs` selects the column.
    Added in `0008_gigs_title_notes.sql`, together with `title`.
  - `is_published`: `1` when the gig may be shown, `0` when it is a draft. The
    public `GET /api/gigs` filters on `is_published = 1` in addition to
    `event_date >= today`, so a draft stays out of "Kommande spelningar" even on
    its own event day. Added in `0009_songs_gigs_is_published.sql`.
  - Nothing is seeded on purpose: an empty table means the landing page renders
    no "Kommande spelningar" section at all.

- **d1_migrations** – Created and managed by Wrangler. Do not edit manually.

## The API response

`GET /api/songs` returns an array with one object per song:

`id`, `recording_id`, `title`, `artist`, `lyrics_by`, `music_by`, `lyrics`,
`sheet_music_path`, `album`, `studio`, `year`, `engineer`, `mp3_path`,
`wav_path`, `cover_path`, `play_count`, `download_count` and
`credits: Array<{ musician, instrument }>`.

- Each song is linked to its **primary public** recording
  (`WHERE r2.is_public = 1 ORDER BY r2.is_primary DESC, r2.id DESC LIMIT 1`), so
  a future remaster becomes the one displayed by flagging it as primary instead
  of relying on insert order. When nothing is flagged the newest public
  recording is used. A song with no public recording joins to nothing and gets
  no playable file, which the landing page filters out.
- `credits` are scoped to that same primary public recording and sorted by
  musician, so the list always describes the recording that is actually played –
  not a union of every recording of the song.
- Only **published** songs are returned (`WHERE s.is_published = 1`), and the
  `credits` query is scoped to the same published songs, so a draft's credits
  cannot leak through the join.
- `recording_id` is the `recordings.id` of the exact recording that
  `mp3_path`/`wav_path` come from (the same subquery row). This is the id sent to
  `POST /api/plays` and to `GET /api/downloads`. If a song ever displays multiple
  recordings at the same time, a single `recording_id` per `Song` is no longer
  sufficient – see the comment in `toSong()`.

## Admin API (functions/api/admin/\*)

The admin surface at `/admin` is protected by **Cloudflare Access** at the edge
(see [UPLOADING.md](./UPLOADING.md) for the second destination that covers
`/api/admin*`). Cloudflare Access does not run locally, so during `npm run
dev:d1` the admin routes are open – that is expected.

| Endpoint                | Methods                        | Purpose                                                                                                                                                    |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/admin/songs`      | `GET`, `POST`, `PUT`, `DELETE` | List every song with **all** its recordings and each recording's credits; create and update songs. `DELETE` removes a song only when it has no recordings. |
| `/api/admin/recordings` | `POST`, `PUT`, `DELETE`        | Create a recording under a song, update one (including `is_primary`/`is_public`), or delete it.                                                            |
| `/api/admin/credits`    | `POST`, `DELETE`               | Add or remove a `(recording_id, musician_id, instrument)` row.                                                                                             |
| `/api/admin/musicians`  | `GET`, `POST`, `PUT`           | List musicians for the dropdown; create one by name (idempotent) and rename one with `PUT`.                                                                |
| `/api/admin/upload`     | `POST`                         | Proxy an mp3/wav/cover/pdf upload into R2 (see [UPLOADING.md](./UPLOADING.md)).                                                                            |
| `/api/admin/content`    | `PUT`                          | Save the editable page copy into `site_content` (`welcome_text`, `about_heading`, `about_body`; read side is the public `GET /api/content`).               |
| `/api/admin/gigs`       | `GET`, `POST`, `PUT`, `DELETE` | Gig calendar: list **every** date incl. past ones, create, update and delete one (validation in `gig-rules.ts`).                                           |

- **mp3 existence:** `POST`/`PUT /api/admin/recordings` require `mp3_path` to be a
  bare `.mp3` file name (`^[A-Za-z0-9._-]+\.mp3$`, no `..`) whose object exists in
  R2. On `POST` the check always runs; on `PUT` only when `mp3_path` changed, so
  editing an old recording with an unusual legacy path still saves. Failures are
  `400 { code: "mp3_invalid" }` / `400 { code: "mp3_missing" }`.
- **Song delete does not cascade:** `DELETE /api/admin/songs?id=<slug>` returns
  `409 { code: "song_has_recordings" }` while any recording references the song,
  `404` when the song is unknown, and otherwise deletes only the `songs` row. R2
  files are never removed by the API.
- **Musician names:** stored NFC-normalized and compared in JS with
  `toLocaleLowerCase("sv")`, because SQLite's `COLLATE NOCASE` is ASCII-only and
  would treat "Örjan" and "örjan" as different. `POST` is idempotent;
  `PUT /api/admin/musicians` allows a case-only rename of the same musician and
  returns `409 { code: "name_conflict" }` for a name used by another one.

`GET /api/admin/songs` returns one object per song with every recording nested
(not only the primary one needed by the public API):

```json
{
  "songs": [
    {
      "id": "fri",
      "title": "Fri",
      "recordings": [
        {
          "id": 1,
          "year": 2023,
          "mp3_path": "fri.mp3",
          "play_count": 0,
          "download_count": 0,
          "is_primary": 1,
          "credits": [
            {
              "musician_id": 2,
              "musician": "Nova Kruskopf Eriksson",
              "instrument": "Sång"
            }
          ]
        }
      ]
    }
  ]
}
```

Conventions:

- Bodies and responses are JSON. Errors are `{ "error": "..." }` with a `4xx`/`5xx`
  status; bad input returns `400`, missing rows `404`, duplicate song ids `409`.
- `DELETE` takes its key(s) as query parameters, e.g.
  `/api/admin/recordings?id=1` and
  `/api/admin/credits?recording_id=1&musician_id=2&instrument=Sång`.
- `play_count` and `download_count` are read-only: they are returned but ignored
  by `POST`/`PUT`.
- `is_published` (boolean) is accepted by `POST`/`PUT` on both songs and gigs and
  stored as `1`/`0`. It is **optional**: a payload that omits it is treated as
  `true`, so an older client keeps publishing. Any other type is a `400`
  (`published_type` for gigs).
- Setting `is_primary: true` clears the flag on the song's other recordings in
  the same `batch()`, so a song never has two primaries.
- Deleting a recording also deletes its credits but leaves the R2 files in the
  bucket. This is intentional: storage is cheap and it avoids accidental data
  loss (an R2 lifecycle rule could clean up strays later).
- Song ids are slugs (`^[a-z0-9]+(-[a-z0-9]+)*$`); the admin UI derives them
  from the title.

## Plays: POST /api/plays

`functions/api/plays.ts` increments `recordings.play_count` by 1.

- **Body:** `{ "recording_id": number }` (positive integer).
- **Response:** `{ "success": true, "play_count": <new value> }`.
- **Errors:** `400` if `recording_id` is missing/invalid, `404` if no row
  matches, `500` on unexpected errors.
- **Call site:** `components/StickyPlayer.tsx` only sends the request after 5
  seconds of **continuous** playback. Pausing cancels the timer, switching
  tracks before 5 s does not count, and the same listening is counted only once
  (a replay after the track has finished counts as a new listening, including
  when the same song plays again from the queue).

## Downloads: GET /api/downloads

`functions/api/downloads.ts` counts a WAV download and then redirects to the
file in R2. The public download button in `components/SongRow.tsx` points here
(`downloadSrc`) instead of straight at the CDN, because the WAV lives on
`cdn.kruskopf.org`: a cross-origin `download` attribute is ignored, so the click
could never be observed in the browser.

- **Query:** `?id=<recording_id>` (positive integer).
- **Response:** `302` to
  `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/<wav_path>` (after
  `download_count` was incremented).
- **Errors:** `400` if `id` is missing/invalid, `404` when the recording does not
  exist, is hidden (`is_public = 0`) or has no `wav_path`, `500` on unexpected
  errors.
- **Call site:** the download link itself, so a redirect – rather than a JS
  `fetch` followed by a navigation – keeps ordinary clicks, middle-clicks and
  keyboard activation working. The R2 object's
  `content-disposition: attachment` is what actually starts the download.
- `//api/` is never cached by the service worker, so a click always reaches the
  Worker.

## Site copy: GET /api/content and PUT /api/admin/content

- `GET /api/content` (public, `functions/api/content.ts`) returns
  `{ "welcomeText": string, "aboutHeading": string, "aboutBody": string }` from
  `site_content`. Missing rows resolve to `""`, so the landing page simply omits
  the welcome line and `/about` falls back to its built-in "Om oss" heading.
- `PUT /api/admin/content` (protected, `functions/api/admin/content.ts`) upserts
  all three keys in one `DB.batch`:
  `{ welcomeText, aboutHeading, aboutBody }` →
  `{ "success": true, ...fields }`. A missing or non-string field (`400`) and a
  field over 20000 characters (`400`) are refused; everything else, including the
  empty string, is stored as given (values are not trimmed, so the editor's line
  breaks survive). The rules live in `content-rules.ts`.
- The admin editor reads through the public endpoint, so there is no duplicate
  GET handler under `/api/admin/`.

## Gigs: GET /api/gigs and GET/POST/PUT/DELETE /api/admin/gigs

- `GET /api/gigs` (public, `functions/api/gigs.ts`) returns `{ "gigs": [...] }`
  for **today and later** **and published only**, ordered by date and start
  time: `id`, `event_date`, `start_time`, `title`, `venue`, `city`, `ticket_url`,
  `info`. Past rows stay in the table so the admin can still fix them, and
  `internal_notes` is **never** selected here – it only exists in the admin
  response.
- The filter binds today's date **in `Europe/Stockholm`**
  (`todayInStockholm()`), not SQLite's UTC `date('now')`: CET/CEST runs ahead of
  UTC, so the UTC date would already be _tomorrow_ during the last hour or two of
  a Swedish gig evening and hide a date that is still today. A gig therefore
  stays visible for its whole Swedish day, until 23:59:59 local time.
- `GET /api/admin/gigs` returns **every** gig (`event_date DESC`), so the admin
  can see and edit past dates; the UI badges them "Passerat". It also returns
  `internal_notes` and `is_published`, which the public endpoint does not expose.
  A draft carries an **Utkast** badge in the admin list.
- `POST` creates (`201`, `{ success, gig }`), `PUT` updates by `id` in the body
  (`404` when it does not exist) and `DELETE ?id=<n>` removes one (`404` when it
  does not exist). Invalid payloads are `400`; see `gig-rules.ts` for the rules
  (valid `YYYY-MM-DD`, optional `HH:MM`, required `venue`, optional `http(s)`
  `ticket_url`, optional `title` and `internal_notes`; line breaks inside `info`
  and `internal_notes` are kept).
- The landing page reads the public endpoint in
  `components/home/GigList.tsx` and renders **nothing** while the list is empty
  or the request fails, so a gig-less site has no empty calendar block.

## URLs and R2

The client builds full URLs from the file names. The base comes from
`NEXT_PUBLIC_AUDIO_BASE_URL` (e.g. `https://cdn.kruskopf.org`).

| Column in D1       | Built in `toSong()` to                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `mp3_path`         | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/<mp3_path>` → `src`                                                         |
| `wav_path`         | `/api/downloads?id=<recording_id>` → `downloadSrc` (the CDN URL is built in the Worker after counting; see above)       |
| `cover_path`       | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/<cover_path>` → `cover`                                                  |
| `sheet_music_path` | No URL is built in the client yet; the file is stored at `parlband/pdf/<sheet_music_path>` and uploaded by the admin UI |

If `wav_path` is missing (or `recording_id` is null) the download button is
omitted, and songs without `mp3_path` are filtered out in the frontend.

These CDN files are deliberately **excluded from the service worker cache** (see
[PWA.md](./PWA.md)). The app shell works offline, but audio, WAV downloads and
cover images are always fetched from R2, so a replaced file is never served stale
by the app (the browser's own HTTP cache may still hold a copy).

## Common commands

### Locally

```bash
npm run preview     # next build + wrangler pages dev out (runs /api/songs locally)
npm run dev:d1      # next dev (3000) + wrangler pages dev (8788, proxy) – HMR + Functions
npm run db:migrate  # apply new files in migrations/ to the local database
npm run db:reset    # reset local D1 and re-run schema + seeds.sql
```

- `npm run dev` (just `next dev`) does **not** serve `/api/songs` – the page then
  shows the error message instead of the song list. Use `preview` or `dev:d1`.
- `db:reset` deletes `.wrangler/state/v3/d1` and rebuilds the database from
  scratch. `seeds.sql` uses plain `INSERT`s and can therefore only be run once
  against an empty database.

### Against remote (production)

```bash
wrangler d1 execute parlband-db --remote --command="SELECT id, title FROM songs"
wrangler d1 migrations apply parlband-db --remote
```

Always use `--remote` for production data – without the flag the change lands in
the local test database.

## Principles

- **Lyrics (`lyrics`)** live on `songs`, since the text belongs to the song
  regardless of recording. This column is the accessible, web-rendered reading
  path (Phase 7); a future `chords` column can hold ChordPro-style chord charts.
- **Sheet music (`sheet_music_path`)** is a single finished PDF per song, stored
  in R2 instead of raw text in the database, to guarantee perfect typography and
  formatting for notation/print. It is uploaded from the admin UI (PDF only).
- **Files & recordings** live on `recordings`, so future remasters or live
  versions do not touch the work data.
- **Schemas are versioned** with SQL files in `migrations/`, not through manual
  changes in the Cloudflare dashboard.
