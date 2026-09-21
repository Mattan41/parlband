-- Editable site copy as key/value, starting with the "Om oss" body.
--
-- The public /about page reads `about_body` through GET /api/content and the band
-- edits it at /admin/about (PUT /api/admin/content). A key/value table keeps the
-- schema stable when more editable copy is added later (see 0007, which adds
-- `welcome_text` and `about_heading`).
--
-- The seed keeps the sentence that used to sit in the landing-page hero, so
-- /about is not empty on first deploy; the band replaces it in the admin UI.
CREATE TABLE site_content (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO site_content (key, value) VALUES
  ('about_body', 'Vi håller på att bygga upp den här sidan.');
