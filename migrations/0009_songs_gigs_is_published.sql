-- Draft/publish visibility for songs and gigs.
--
-- `is_published` answers "may this row be shown on the public site?" for the two
-- top-level catalog entities. It is independent of `recordings.is_public`, which
-- only decides whether a single take is shown once the song itself is public.
--
-- Default 1 keeps every existing song and gig visible, matching today's
-- behaviour. Unpublished rows stay fully editable in the admin and are only
-- filtered out by the public GET /api/songs and GET /api/gigs.
ALTER TABLE songs ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1;

ALTER TABLE gigs ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1;