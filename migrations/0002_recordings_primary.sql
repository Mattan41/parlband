-- Explicit "primary" recording per song.
--
-- The public API used to pick the recording with the highest id (most recently
-- inserted), which broke as soon as an older recording was added after a newer
-- one. `is_primary` makes the choice deliberate: admin can toggle it, and the
-- public API prefers the primary recording (falling back to the newest id when
-- nothing is flagged).
ALTER TABLE recordings ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0;

-- Backfill: keep the previously displayed recording (newest per song) primary.
UPDATE recordings
SET is_primary = 1
WHERE id IN (
  SELECT MAX(id) FROM recordings GROUP BY song_id
);
