# Uploading songs to R2

Bucket: `kruskopf-cdn`, prefix `parlband/`

This is where the **files** are uploaded. **Metadata** (title, lyricist, file
names, credits, etc.) lives in D1 and is added separately – see
[DATABASE.md](./DATABASE.md).

## Important

- Always use `--remote`, otherwise the file is only uploaded to Wrangler's
  local test instance (shown as "Resource location: local" in the output)
  and never becomes available at https://cdn.kruskopf.org
- WAV files must have `--content-disposition="attachment; filename=X.wav"`,
  otherwise the browser plays the file instead of downloading it
  (the `download` attribute in HTML only works same-origin). The public download
  button goes through `GET /api/downloads`, which counts the click and then
  redirects here, so this header – not the `download` attribute – is what starts
  the download (see [DATABASE.md](./DATABASE.md))
- MP3 files need NO content-disposition (they are meant to be streamed in the player)
- File names: pure ASCII, no spaces or å/ä/ö
- The PWA service worker never caches `cdn.kruskopf.org` (`/parlband/mp3/`,
  `/parlband/wav/`, images), so it can never serve a stale copy of a replaced
  file – see [PWA.md](./PWA.md)

## Via the admin UI

`/admin` (protected by Cloudflare Access) uploads files through
`functions/api/admin/upload.ts` instead of the CLI. The file is sent as the raw
request body and **streamed** straight into R2, so nothing is buffered in the
Worker:

```
POST /api/admin/upload?kind=mp3|wav|cover|pdf&song_id=<slug>[&recording_id=<id>]
Content-Type: <the file's content type>
<raw file bytes>
```

- The R2 key for **mp3, wav and cover** now gets a **unique suffix per upload**:
  `<song_id>-<8 hex>.mp3` → `parlband/mp3/`, `<song_id>-<8 hex>.wav` →
  `parlband/wav/`, `<song_id>-<8 hex>.<jpg|png|webp|avif|gif>` →
  `parlband/images/`. The 8 hex characters are generated server-side, so a
  second recording of the same song never overwrites the first recording's file.
  The old objects are left in the bucket when you re-upload.
- The **PDF** keeps the stable `<song_id>.pdf` key → `parlband/pdf/` (one document
  per song, replaced on re-upload).
- WAV objects get `content-disposition: attachment; filename="<song_id>.wav"`
  (the hashed key stays server-side); MP3 and PDF get none – PDFs therefore open
  inline in the browser viewer, same as the CLI commands below.
- `cache-control: immutable` is only set for mp3/wav/cover (unique keys). The PDF
  is served without `immutable` because its key is overwritten on re-upload.
- When `recording_id` is given, the matching recording column (`mp3_path` /
  `wav_path` / `cover_path`) is updated to the stored file name, so no separate
  save is needed. The recording must belong to `song_id`, otherwise the endpoint
  returns `400`.
- A PDF belongs to the **song**, not the recording: it is stored as
  `<song_id>.pdf` and written to `songs.sheet_music_path` (no `recording_id`
  needed). The song must already exist, otherwise the endpoint returns `404`.
- Size limits: mp3 25 MB, cover 10 MB, wav 50 MB, pdf 20 MB. The WAV limit keeps
  the upload inside the Worker's memory ceiling while streaming; larger masters
  need the CLI below (or a future multipart upload).
- The returned URL uses `NEXT_PUBLIC_AUDIO_BASE_URL`, so the same file is
  immediately reachable at `https://cdn.kruskopf.org/parlband/...`.
- The API only stores the file and updates the row; a recording whose `mp3_path`
  points at a missing object is refused by `POST`/`PUT /api/admin/recordings`
  (`400`, code `mp3_missing`).

### Cloudflare Access

Access protects `parlband.kruskopf.org/admin*` **and**
`parlband.kruskopf.org/api/admin*` – two destinations on the same Access
application with the same policy. The second one is essential: protecting only
the UI route would leave the write endpoints open to anyone who finds the URL.
Access runs only at Cloudflare's edge, so local `wrangler pages dev` does not
enforce it (expected, not a bug).

Independently of the edge policy, every `/api/admin/*` request is also checked in
`functions/api/admin/_middleware.ts`: the `Cf-Access-Jwt-Assertion` header is
verified (signature, issuer, audience, expiry) against `CF_ACCESS_TEAM_DOMAIN` /
`CF_ACCESS_AUD`, and anything else returns `401`. Locally that check is skipped
with `NODE_ENV=development` in `.dev.vars` **and** a `localhost` URL – see
[ADMIN.md](./ADMIN.md) and the README.

## Uploading a new song

```bash
# MP3 (streaming)
wrangler r2 object put kruskopf-cdn/parlband/mp3/NAME.mp3 \
  --file=./NAME.mp3 --remote

# WAV (download)
wrangler r2 object put kruskopf-cdn/parlband/wav/NAME.wav \
  --file=./NAME.wav \
  --content-disposition="attachment; filename=NAME.wav" \
  --remote
```

## Cover and sheet music

```bash
# Cover (optional) – used by cover_path
wrangler r2 object put kruskopf-cdn/parlband/images/NAME.jpg \
  --file=./NAME.jpg --remote

# Sheet music/chords as PDF (optional) – sheet_music_path is a relative path in R2
wrangler r2 object put kruskopf-cdn/parlband/pdf/NAME.pdf \
  --file=./NAME.pdf --remote
```

Leave `cover_path` / `sheet_music_path` as `NULL` if the file does not exist.
For `cover_path` the app builds the URL `.../parlband/images/<cover_path>`.
`sheet_music_path` stores the PDF file name, served at
`.../parlband/pdf/<sheet_music_path>`. The admin UI writes it automatically via
`POST /api/admin/upload?kind=pdf&song_id=<slug>` (see "Via the admin UI" above);
no public link is built in the frontend yet.

## Verify

```bash
curl -I https://cdn.kruskopf.org/parlband/wav/NAME.wav
```

Check that the response is `200` and contains `content-disposition: attachment; filename=NAME.wav`.

## If `wrangler login` gives a CSRF error

Run `wrangler login` from a folder outside the project (e.g. `~/Downloads`) —
that solved the problem last time, probably due to a port/config clash with the
project folder.

## Add the song to D1

A new song only shows up once the row exists in D1. Run against remote when the
files are uploaded:

```bash
wrangler d1 execute parlband-db --remote --command="
INSERT INTO songs (id, title, artist, lyrics_by, music_by, lyrics, sheet_music_path)
VALUES ('ny-lat', 'Ny låt', 'Pärlband', 'Textförfattare', 'Kompositör', NULL, NULL);

INSERT INTO recordings (song_id, album, studio, year, engineer, mp3_path, wav_path, cover_path, play_count)
VALUES ('ny-lat', NULL, 'Hemmastudio', 2026, NULL, 'ny-lat.mp3', 'ny-lat.wav', NULL, 0);
"
```

- `id` is the slug used in `mp3_path` / `wav_path` – keep them in sync.
- Do not repeat the `INSERT` for a song that already exists; use `UPDATE` or
  delete the row first.
- Credits are optional and require the musician to exist in `musicians`:

```bash
wrangler d1 execute parlband-db --remote --command="
INSERT INTO recording_credits (recording_id, musician_id, instrument)
SELECT r.id, m.id, 'Akustisk gitarr'
FROM recordings r, musicians m
WHERE r.song_id = 'ny-lat' AND m.name = 'Mats Kruskopf Eriksson';
"
```

## Verify in the app

```bash
npm run preview
curl -s http://localhost:8788/api/songs | grep -o '"id":"ny-lat"'
```

No match? Check that the song has a `recordings` row with `mp3_path` – songs
without an mp3 are filtered out in the frontend. See
[DATABASE.md](./DATABASE.md) for the data flow and commands.
