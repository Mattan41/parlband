-- Site settings, stored as key/value rows in the same `site_content` table as
-- the editable page copy (see 0005_site_content.sql).
--
-- `playback_mode` controls what the sticky player does when its queue is empty
-- and the current track ends:
--   'none' – stop after the current track (no auto-advance).
--   'once' – play through the whole catalogue once, then stop.
--   'loop' – keep advancing and start over at the end (the default).
--
-- The app falls back to 'loop' when the row is missing, so a database that has
-- not run this migration behaves exactly like before. The row makes the default
-- explicit and editable at /admin/settings.
INSERT INTO site_content (key, value) VALUES
  ('playback_mode', 'loop');
