-- Adds a gig title and band-only internal notes to the gig calendar.
--
-- `title` is the gig's own name (e.g. a festival), shown in the admin list and,
-- when set, on the landing page; `internal_notes` is for the band only and is
-- never returned by the public GET /api/gigs.
--
-- Both are nullable so the dates that already exist keep working unchanged.
ALTER TABLE gigs ADD COLUMN title TEXT;

ALTER TABLE gigs ADD COLUMN internal_notes TEXT;
