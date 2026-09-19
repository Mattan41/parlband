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
  └─ functions/api/admin/*    /api/admin/*   (CRUD + R2 uploads: mp3/wav/cover/pdf)
       └─ app/admin/page.tsx  admin UI (protected by Cloudflare Access)
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

- **recordings** – A specific recorded version of a song.
  - `id`: Autoincrement, `song_id` → `songs.id`.
  - `album`, `studio`, `year`, `engineer`, `notes`: Technical metadata.
  - `mp3_path`, `wav_path`, `cover_path`: File names in R2 (see [UPLOADING.md](./UPLOADING.md)).
  - `play_count`: Number of plays. Derived counter – never set through the admin
    API.
  - `is_primary`: `1` for the recording the public API serves for the song. A
    song may have several recordings (e.g. studio + live); only the primary one
    is exposed publicly. The admin API keeps exactly one primary per song.

- **musicians** – Registry of contributing musicians (`id`, `name`).

- **recording_credits** – Join table for who played which instrument on a given recording (`recording_id`, `musician_id`, `instrument`).

- **d1_migrations** – Created and managed by Wrangler. Do not edit manually.

## The API response

`GET /api/songs` returns an array with one object per song:

`id`, `recording_id`, `title`, `artist`, `lyrics_by`, `music_by`, `lyrics`,
`sheet_music_path`, `album`, `studio`, `year`, `engineer`, `mp3_path`,
`wav_path`, `cover_path`, `play_count` and
`credits: Array<{ musician, instrument }>`.

- Each song is linked to its **primary** recording
  (`ORDER BY r2.is_primary DESC, r2.id DESC LIMIT 1`), so a future remaster
  becomes the one displayed by flagging it as primary instead of relying on
  insert order. When nothing is flagged the newest recording is used.
- `credits` are scoped to that same primary recording and sorted by musician,
  so the list always describes the recording that is actually played – not a
  union of every recording of the song.
- `recording_id` is the `recordings.id` of the exact recording that
  `mp3_path`/`wav_path` come from (the same subquery row). This is the id sent to
  `POST /api/plays`. If a song ever displays multiple recordings at the same
  time, a single `recording_id` per `Song` is no longer sufficient – see the
  comment in `toSong()`.

## Admin API (functions/api/admin/\*)

The admin surface at `/admin` is protected by **Cloudflare Access** at the edge
(see [UPLOADING.md](./UPLOADING.md) for the second destination that covers
`/api/admin*`). Cloudflare Access does not run locally, so during `npm run
dev:d1` the admin routes are open – that is expected.

| Endpoint                | Methods                 | Purpose                                                                                            |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `/api/admin/songs`      | `GET`, `POST`, `PUT`    | List every song with **all** its recordings and each recording's credits; create and update songs. |
| `/api/admin/recordings` | `POST`, `PUT`, `DELETE` | Create a recording under a song, update one (including `is_primary`), or delete it.                |
| `/api/admin/credits`    | `POST`, `DELETE`        | Add or remove a `(recording_id, musician_id, instrument)` row.                                     |
| `/api/admin/musicians`  | `GET`, `POST`           | List musicians for the dropdown; create one by name (case-insensitive and idempotent).             |
| `/api/admin/upload`     | `POST`                  | Proxy an mp3/wav/cover/pdf upload into R2 (see [UPLOADING.md](./UPLOADING.md)).                    |

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
- `play_count` is read-only: it is returned but ignored by `POST`/`PUT`.
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

## URLs and R2

The client builds full URLs from the file names. The base comes from
`NEXT_PUBLIC_AUDIO_BASE_URL` (e.g. `https://cdn.kruskopf.org`).

| Column in D1       | Built in `toSong()` to                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `mp3_path`         | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/<mp3_path>` → `src`                                                         |
| `wav_path`         | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/<wav_path>` → `downloadSrc`                                                 |
| `cover_path`       | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/<cover_path>` → `cover`                                                  |
| `sheet_music_path` | No URL is built in the client yet; the file is stored at `parlband/pdf/<sheet_music_path>` and uploaded by the admin UI |

If `wav_path` is missing the download button is omitted, and songs without
`mp3_path` are filtered out in the frontend.

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
