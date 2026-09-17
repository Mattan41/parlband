# Databas & dataflöde (Cloudflare D1)

All låtdata kommer från D1-databasen `parlband-db`. Den läses av en Pages
Function och skickas som JSON till frontend – det finns ingen statisk
låtlista i koden.

## Dataflöde

```
D1 (parlband-db)
  └─ functions/api/songs.ts   GET /api/songs  (rå rader + nästlade credits)
       └─ data/songs.ts       toSong(): rad → Song + hjälp-URL:er
            └─ app/page.tsx   hämtar /api/songs vid mount → <AudioPlayer>
```

Bindningen definieras i `wrangler.toml` och heter `DB`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "parlband-db"
database_id = "b685ab25-61b7-4ebe-bc25-6a22bd8b2b99"
```

## Tabeller

- **songs** – Det abstrakta musikaliska verket.
  - `id`: Slug/ID (t.ex. 'fri').
  - `title`: Låttitel.
  - `artist`: Huvudartist/band (t.ex. 'Pärlband').
  - `lyrics_by`: Textförfattare.
  - `music_by`: Kompositör.
  - `lyrics`: Själva sångtexten (ren text med radbrytningar).
  - `sheet_music_path`: Relativ sökväg till noter/ackord i PDF-format i R2 (valfri).

- **recordings** – En specifik inspelningsversion av en låt.
  - `id`: Autoincrement, `song_id` → `songs.id`.
  - `album`, `studio`, `year`, `engineer`, `notes`: Teknisk metadata.
  - `mp3_path`, `wav_path`, `cover_path`: Filnamn i R2 (se [UPLOADING.md](./UPLOADING.md)).
  - `play_count`: Antal spelningar.

- **musicians** – Register över medverkande musiker (`id`, `name`).

- **recording_credits** – Kopplingstabell för vem som spelade vilket instrument på en given inspelning (`recording_id`, `musician_id`, `instrument`).

- **d1_migrations** – Skapas och sköts av Wrangler. Redigera inte manuellt.

## API-svaret

`GET /api/songs` returnerar en array med ett objekt per låt:

`id`, `title`, `artist`, `lyrics_by`, `music_by`, `lyrics`, `sheet_music_path`,
`album`, `studio`, `year`, `engineer`, `mp3_path`, `wav_path`, `cover_path`,
`play_count` samt `credits: Array<{ musician, instrument }>`.

- Varje låt kopplas till sin **senaste** inspelning (`ORDER BY r2.id DESC LIMIT 1`),
  så en framtida remaster blir den som visas utan att verksdatan ändras.
- `credits` slås ihop per låt från låtens inspelningar och sorteras på musiker.

## URL:er och R2

Klienten bygger fullständiga URL:er utifrån filnamnen. Basen kommer från
`NEXT_PUBLIC_AUDIO_BASE_URL` (t.ex. `https://cdn.kruskopf.org`).

| Kolumn i D1 | Byggs i `toSong()` till |
| --- | --- |
| `mp3_path` | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/mp3/<mp3_path>` → `src` |
| `wav_path` | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/wav/<wav_path>` → `downloadSrc` |
| `cover_path` | `${NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/<cover_path>` → `cover` |
| `sheet_music_path` | Ingen URL byggs ännu (ingen UI använder den) |

Saknas `wav_path` utelämnas nedladdningsknappen, och låtar utan `mp3_path`
filtreras bort i frontend.

## Vanliga kommandon

### Lokalt

```bash
npm run preview     # next build + wrangler pages dev out (kör /api/songs lokalt)
npm run dev:d1      # next dev (3000) + wrangler pages dev (8788, proxy) – HMR + Functions
npm run db:migrate  # applicera nya filer i migrations/ på den lokala databasen
npm run db:reset    # nollställ lokal D1 och kör om schema + seeds.sql
```

- `npm run dev` (bara `next dev`) serverar **inte** `/api/songs` – sidan visar
  då felmeddelandet i stället för låtlistan. Använd `preview` eller `dev:d1`.
- `db:reset` raderar `.wrangler/state/v3/d1` och bygger upp databasen på nytt.
  `seeds.sql` använder vanliga `INSERT` och kan därför bara köras en gång mot
  en tom databas.

### Mot remote (produktion)

```bash
wrangler d1 execute parlband-db --remote --command="SELECT id, title FROM songs"
wrangler d1 migrations apply parlband-db --remote
```

Använd alltid `--remote` för produktionsdata – utan flaggan hamnar ändringen i
den lokala testdatabasen.

## Principer
- **Sångtext (`lyrics`)** ligger på `songs` då texten hör till låten oavsett inspelning.
- **Noter/ackord (`sheet_music_path`)** länkas som färdiga PDF-filer lagrade i R2 istället för råtext i databasen för att garantera perfekt typografi och formatering.
- **Filer & Spelningar** ligger på `recordings` så att framtida remasters eller liveversioner inte rör verksdatan.
- **Scheman versioneras** med SQL-filer i `migrations/`, inte genom manuella ändringar i Cloudflare-dashboarden.