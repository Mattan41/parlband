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
```

The binding is defined in `wrangler.toml` and is named `DB`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "parlband-db"
database_id = "b685ab25-61b7-4ebe-bc25-6a22bd8b2b99"
```

## Tables

- **songs** – The abstract musical work.
  - `id`: Slug/ID (e.g. 'fri').
  - `title`: Song title.
  - `artist`: Main artist/band (e.g. 'Pärlband').
  - `lyrics_by`: Lyricist.
  - `music_by`: Composer.
  - `lyrics`: The lyrics themselves (plain text with line breaks).
  - `sheet_music_path`: Relative path to sheet music/chords as a PDF in R2 (optional).

- **recordings** – A specific recorded version of a song.
  - `id`: Autoincrement, `song_id` → `songs.id`.
  - `album`, `studio`, `year`, `engineer`, `notes`: Technical metadata.
  - `mp3_path`, `wav_path`, `cover_path`: File names in R2 (see [UPLOADING.md](./UPLOADING.md)).
  - `play_count`: Number of plays.

- **musicians** – Registry of contributing musicians (`id`, `name`).

- **recording_credits** – Join table for who played which instrument on a given recording (`recording_id`, `musician_id`, `instrument`).

- **d1_migrations** – Created and managed by Wrangler. Do not edit manually.

## The API response

`GET /api/songs` returns an array with one object per song:

`id`, `recording_id`, `title`, `artist`, `lyrics_by`, `music_by`, `lyrics`,
`sheet_music_path`, `album`, `studio`, `year`, `engineer`, `mp3_path`,
`wav_path`, `cover_path`, `play_count` and
`credits: Array<{ musician, instrument }>`.

- Each song is linked to its **latest** recording (`ORDER BY r2.id DESC LIMIT 1`),
  so a future remaster becomes the one displayed without changing the work data.
- `credits` is merged per song from the song's recordings and sorted by musician.
- `recording_id` is the `recordings.id` of the exact recording that
  `mp3_path`/`wav_path` come from (the same subquery row). This is the id sent to
  `POST /api/plays`. If a song ever displays multiple recordings at the same
  time, a single `recording_id` per `Song` is no longer sufficient – see the
  comment in `toSong()`.

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

| Column in D1       | Built in `toSong()` to                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| `mp3_path`         | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/<mp3_path>` → `src`         |
| `wav_path`         | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/<wav_path>` → `downloadSrc` |
| `cover_path`       | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/<cover_path>` → `cover`  |
| `sheet_music_path` | No URL is built yet (nothing in the UI uses it)                         |

If `wav_path` is missing the download button is omitted, and songs without
`mp3_path` are filtered out in the frontend.

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
  regardless of recording.
- **Sheet music/chords (`sheet_music_path`)** are linked as finished PDF files
  stored in R2 instead of raw text in the database, to guarantee perfect
  typography and formatting.
- **Files & recordings** live on `recordings`, so future remasters or live
  versions do not touch the work data.
- **Schemas are versioned** with SQL files in `migrations/`, not through manual
  changes in the Cloudflare dashboard.
