# Uppladdning av låtar till R2

Bucket: `kruskopf-cdn`, prefix `parlband/`

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

## Verifiera

```bash
curl -I https://cdn.kruskopf.org/parlband/wav/NAMN.wav
```

Kolla att svaret är `200` och innehåller `content-disposition: attachment; filename=NAMN.wav`.

## Om `wrangler login` ger CSRF-fel

Kör `wrangler login` från en mapp utanför projektet (t.ex. `~/Downloads`) —
löste problemet senast, troligen pga port-/config-krock med projektmappen.

## Glöm inte

Lägg till den nya låten i `data/songs.ts` med rätt `id`, `title`, `artist`.