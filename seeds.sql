-- ============================================================================
-- 1. MUSIKER
-- ============================================================================
INSERT INTO musicians (id, name) VALUES
  (1, 'Mats Kruskopf Eriksson'),
  (2, 'Nova Kruskopf Eriksson'),
  (3, 'Örjan Ahnoff');

-- ============================================================================
-- 2. LÅTAR (Det abstrakta verket)
-- ============================================================================
INSERT INTO songs (id, title, artist, lyrics_by, music_by, lyrics, sheet_music_path) VALUES
  ('fri', 'Fri', 'Pärlband', 'Nova Kruskopf Eriksson', 'Nova Kruskopf Eriksson', NULL, NULL),
  ('som-en-legend', 'Som en Legend', 'Pärlband', 'Mats Kruskopf Eriksson', 'Mats Kruskopf Eriksson', NULL, NULL),
  ('cohen-och-kent', 'Cohen och Kent', 'Pärlband', 'Isabel Evers', 'Mats Kruskopf Eriksson', NULL, NULL),
  ('mareld-i-natt', 'Mareld i natt', 'Pärlband', 'Nova Kruskopf Eriksson', 'Nova Kruskopf Eriksson', NULL, NULL),
  ('sommarn-pa-boganeberget', 'Sommarn på Boganeberget', 'Pärlband', 'Nova Kruskopf Eriksson', 'Nova Kruskopf Eriksson', NULL, NULL),
  ('mitt-ute-pa-fryken', 'Mitt ute på Fryken', 'Pärlband', 'Nova Kruskopf Eriksson', 'Örjan Ahnoff', NULL, NULL),
  ('klockan-12', 'Klockan 12', 'Pärlband', 'Mats Kruskopf Eriksson', 'Mats Kruskopf Eriksson', NULL, NULL),
  ('slaget-vid-poltava', 'Slaget vid Poltava', 'Pärlband', 'Nova Kruskopf Eriksson', 'Nova Kruskopf Eriksson', NULL, NULL);

-- ============================================================================
-- 3. INSPELNINGAR (R2-filer & metadata)
-- ============================================================================
INSERT INTO recordings (song_id, album, studio, year, engineer, mp3_path, wav_path, cover_path, play_count) VALUES
  ('fri', NULL, 'Hemmastudio', 2023, NULL, 'fri.mp3', 'fri.wav', NULL, 0),
  ('som-en-legend', NULL, 'Hemmastudio', 2026, NULL, 'som-en-legend.mp3', 'som-en-legend.wav', NULL, 0),
  ('cohen-och-kent', NULL, 'Hemmastudio', 2022, NULL, 'cohen-och-kent.mp3', 'cohen-och-kent.wav', NULL, 0),
  ('mareld-i-natt', NULL, 'Hemmastudio', 2026, NULL, 'mareld-i-natt.mp3', NULL, NULL, 0),
  ('sommarn-pa-boganeberget', NULL, 'Hemmastudio', 2026, NULL, 'sommarn-pa-boganeberget.mp3', 'sommarn-pa-boganeberget.wav', NULL, 0),
  ('mitt-ute-pa-fryken', NULL, 'Hemmastudio', 2018, NULL, 'mitt-ute-pa-fryken.mp3', 'mitt-ute-pa-fryken.wav', NULL, 0),
  ('klockan-12', NULL, 'Hemmastudio', 2012, 'Erik Walfridsson', 'klockan-12.mp3', NULL, NULL, 0),
  ('slaget-vid-poltava', NULL, 'Hemmastudio', 2018, NULL, 'slaget-vid-poltava.mp3', 'slaget-vid-poltava.wav', NULL, 0);

-- ============================================================================
-- 4. CREDITS (Exempel på hur du fyller på vem som gör vad per recording_id)
-- recording_id matchar ID:t i recordings (1 = Fri, 2 = Som en Legend, etc.)
-- ============================================================================
-- Exempel:
-- INSERT INTO recording_credits (recording_id, musician_id, instrument) VALUES
--   (1, 2, 'Sång'),
--   (1, 1, 'Akustisk gitarr'),
--   (1, 3, 'Bas');