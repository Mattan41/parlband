-- Defaults for the page copy that became editable after 0005_site_content.sql.
--
-- 0005 only seeded `about_body`; the welcome line on the landing page and the
-- "Om oss" heading were hardcoded in the components. Both are editable at
-- /admin/about now, so the current text has to live in the database.
--
-- Empty values are allowed: an empty welcome line hides the paragraph, and an
-- empty heading falls back to "Om oss" in the page.
INSERT INTO site_content (key, value) VALUES
  ('welcome_text', 'Välkommen till Pärlband! Här kan du lyssna på vår musik och läsa låttexterna.'),
  ('about_heading', 'Om oss');
