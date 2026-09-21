-- Download counter per recording, alongside play_count.
--
-- Incremented by functions/api/downloads.ts when a visitor downloads the WAV
-- through the public counting endpoint. Like play_count it is a derived counter
-- and is never set through the admin API.
ALTER TABLE recordings ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;
