-- Playlist order for the public song list.
--
-- `sort_order` is a contiguous 1..N position (1 = first) that the admin
-- controls at /admin/playlist. PUT /api/admin/playlist renumbers the whole list
-- in a single transaction whenever the order changes, so the numbers always
-- mean "position" and can never drift.
--
-- It replaces the implicit "newest recording year, then title" ordering in
-- GET /api/songs; that order stays only as the tiebreak for rows still at 0.
-- `DEFAULT 0` keeps a row that has not been placed yet (seeds.sql, or a row
-- inserted before the first save) renderable: zeros sort first, by year and
-- title, i.e. exactly the behaviour the site had before this migration.
ALTER TABLE songs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill with the order the landing page showed before this migration: the
-- year of the song's canonical public recording (newest first), then title.
-- Nothing moves on the public site until the admin reorders the list.
WITH ordered AS (
  SELECT
    s.id,
    ROW_NUMBER() OVER (
      ORDER BY (
        SELECT r.year
        FROM recordings r
        WHERE r.song_id = s.id AND r.is_public = 1
        ORDER BY r.is_primary DESC, r.id DESC
        LIMIT 1
      ) DESC,
      s.title COLLATE NOCASE
    ) AS position
  FROM songs s
)
UPDATE songs
SET sort_order = (SELECT position FROM ordered WHERE ordered.id = songs.id);
