-- Gig calendar ("Kommande spelningar"), editable at /admin/spelningar.
--
-- The public GET /api/gigs only returns rows whose event_date is today or
-- later, so past dates stay in the table (still editable in the admin) and
-- disappear from the site on their own. Nothing is seeded on purpose: an empty
-- table means the landing page renders no gig section at all.
CREATE TABLE gigs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT NOT NULL,
    start_time TEXT,
    venue TEXT NOT NULL,
    city TEXT,
    ticket_url TEXT,
    info TEXT
);

CREATE INDEX idx_gigs_event_date ON gigs (event_date);