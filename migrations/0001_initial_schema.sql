CREATE TABLE songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    lyrics_by TEXT NOT NULL,
    music_by TEXT NOT NULL,
    lyrics TEXT,
    sheet_music_path TEXT
);

CREATE TABLE recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL REFERENCES songs(id),
    album TEXT,
    studio TEXT,
    year INTEGER,
    engineer TEXT,
    notes TEXT,
    mp3_path TEXT NOT NULL,
    wav_path TEXT,
    cover_path TEXT,
    play_count INTEGER DEFAULT 0
);

CREATE TABLE musicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE recording_credits (
    recording_id INTEGER NOT NULL REFERENCES recordings(id),
    musician_id INTEGER NOT NULL REFERENCES musicians(id),
    instrument TEXT NOT NULL,
    PRIMARY KEY (recording_id, musician_id, instrument)
);