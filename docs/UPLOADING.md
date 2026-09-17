# Uppladdning av låtar till R2

Bucket: `kruskopf-cdn`, prefix `parlband/`

Här laddas **filerna** upp. **Metadata** (titel, textförfattare, filnamn,
credits m.m.) ligger i D1 och läggs in separat – se
[DATABASE.md](./DATABASE.md).

## Viktigt

- Använd alltid `--remote`, annars laddas filen bara upp till Wrangler's
  lokala testinstans (syns som "Resource location: local" i outputen)
  och blir aldrig tillgänglig på https://cdn.kruskopf.org
- WAV-filer måste ha `--content-disposition="attachment; filename=X.wav"`
  annars spelar webbläsaren upp filen istället för att ladda ner den
  (download-attributet i HTML fungerar bara same-origin)
- MP3-filer behöver INGEN content-disposition (de ska streamas i spelaren)
- Filnamn: rena ASCII, inga mellanslag eller å/ä/ö

## Ladda upp en ny låt

```bash
# MP3 (streaming)
wrangler r2 object put kruskopf-cdn/parlband/mp3/NAMN.mp3 \
  --file=./NAMN.mp3 --remote

# WAV (nedladdning)
wrangler r2 object put kruskopf-cdn/parlband/wav/NAMN.wav \
  --file=./NAMN.wav \
  --content-disposition="attachment; filename=NAMN.wav" \
  --remote
```

## Cover och noter

```bash
# Cover (valfritt) – används av cover_path
wrangler r2 object put kruskopf-cdn/parlband/images/NAMN.jpg \
  --file=./NAMN.jpg --remote

# Noter/ackord som PDF (valfritt) – sheet_music_path är en relativ sökväg i R2
wrangler r2 object put kruskopf-cdn/parlband/pdf/NAMN.pdf \
  --file=./NAMN.pdf --remote
```

Låt `cover_path` / `sheet_music_path` vara `NULL` om filen inte finns.
För `cover_path` bygger appen URL:en `.../parlband/images/<cover_path>`;
`sheet_music_path` är bara metadata än så länge (ingen URL byggs i koden).

## Verifiera

```bash
curl -I https://cdn.kruskopf.org/parlband/wav/NAMN.wav
```

Kolla att svaret är `200` och innehåller `content-disposition: attachment; filename=NAMN.wav`.

## Om `wrangler login` ger CSRF-fel

Kör `wrangler login` från en mapp utanför projektet (t.ex. `~/Downloads`) —
löste problemet senast, troligen pga port-/config-krock med projektmappen.

## Lägg in låten i D1

En ny låt syns först när raden finns i D1. Kör mot remote när filerna är
uppladdade:

```bash
wrangler d1 execute parlband-db --remote --command="
INSERT INTO songs (id, title, artist, lyrics_by, music_by, lyrics, sheet_music_path)
VALUES ('ny-lat', 'Ny låt', 'Pärlband', 'Textförfattare', 'Kompositör', NULL, NULL);

INSERT INTO recordings (song_id, album, studio, year, engineer, mp3_path, wav_path, cover_path, play_count)
VALUES ('ny-lat', NULL, 'Hemmastudio', 2026, NULL, 'ny-lat.mp3', 'ny-lat.wav', NULL, 0);
"
```

- `id` är sluggen som används i `mp3_path` / `wav_path` – håll dem i synk.
- Upprepa inte `INSERT`-en för en låt som redan finns; använd `UPDATE` eller
  radera raden först.
- Credits är valfria och kräver att musikern finns i `musicians`:

```bash
wrangler d1 execute parlband-db --remote --command="
INSERT INTO recording_credits (recording_id, musician_id, instrument)
SELECT r.id, m.id, 'Akustisk gitarr'
FROM recordings r, musicians m
WHERE r.song_id = 'ny-lat' AND m.name = 'Mats Kruskopf Eriksson';
"
```

## Verifiera i appen

```bash
npm run preview
curl -s http://localhost:8788/api/songs | grep -o '"id":"ny-lat"'
```

Får du ingen träff: kontrollera att låten har en `recordings`-rad med
`mp3_path` – låtar utan mp3 filtreras bort i frontend. Se
[DATABASE.md](./DATABASE.md) för dataflöde och kommandon.
