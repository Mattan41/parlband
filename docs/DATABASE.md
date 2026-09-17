# Databasstruktur (Cloudflare D1)

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
  - Kopplad via `song_id`. Håller teknisk metadata, studioinfo, år samt filnamn (`mp3_path`, `wav_path`, `cover_path`) och `play_count`.

- **musicians** – Register över medverkande musiker.

- **recording_credits** – Kopplingstabell för vem som spelade vilket instrument på en given inspelning.

## Principer
- **Sångtext (`lyrics`)** ligger på `songs` då texten hör till låten oavsett inspelning.
- **Noter/ackord (`sheet_music_path`)** länkas som färdiga PDF-filer lagrade i R2 istället för råtext i databasen för att garantera perfekt typografi och formatering.
- **Filer & Spelningar** ligger på `recordings` så att framtida remasters eller liveversioner inte rör verksdatan.