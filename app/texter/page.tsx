"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { formatSongCredits } from "@/components/songCredits";
import {
  filterLyricLines,
  hasChordLines,
} from "@/components/texter/lyricsLines";
import { toSong, type Song, type SongRow as SongRowData } from "@/data/songs";

/** Song with a guaranteed non-empty `lyrics` string. */
type SongWithLyrics = Song & { lyrics: string };

/** Narrow a song down to the ones that actually have lyrics worth showing. */
function hasLyrics(song: Song): song is SongWithLyrics {
  return typeof song.lyrics === "string" && song.lyrics.trim() !== "";
}

/**
 * /texter – lyrics and chords, rendered as plain text exactly as stored.
 *
 * The route is static (no dynamic segments): the static export has no song
 * data at build time, so everything is fetched at runtime from /api/songs.
 *
 * `TexterView` reads the `?song=<id>` query string through `useSearchParams`,
 * which during a production build forces the tree below the closest Suspense
 * boundary to be client-side rendered. The boundary below is therefore
 * required, not cosmetic — without it the static export build fails.
 */
export default function TexterPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-6 px-4 pt-8 pb-32 sm:gap-10 sm:pt-16">
        <SiteNav />

        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Texter
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Låttexter och ackord.
          </p>
        </header>

        <Suspense
          fallback={<p className="text-center text-zinc-500">Laddar texter…</p>}
        >
          <TexterView />
        </Suspense>
      </main>
    </div>
  );
}

function TexterView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [songs, setSongs] = useState<SongWithLyrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  /**
   * Detail-view selection, seeded from ?song=<id> on mount so a shared or
   * bookmarked URL opens straight to that song. A query param that does not
   * match a loaded song resolves to no selection (and the list view).
   */
  const [selectedSongId, setSelectedSongId] = useState<string | null>(() =>
    searchParams.get("song")
  );
  /**
   * Lyrics-only by default; the toggle reveals the chord/instruction lines.
   * Purely a rendering preference and not persisted.
   */
  const [showChords, setShowChords] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/songs")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load songs: ${response.status}`);
        }
        return response.json() as Promise<SongRowData[]>;
      })
      .then((rows) => {
        if (cancelled) return;
        setSongs(rows.map(toSong).filter(hasLyrics));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? null;

  function selectSong(id: string) {
    setSelectedSongId(id);
    // replace (not push) so flipping between songs does not spam browser history.
    router.replace(`${pathname}?song=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function clearSelection() {
    setSelectedSongId(null);
    router.replace(pathname, { scroll: false });
  }

  if (loading) {
    return <p className="text-center text-zinc-500">Laddar texter…</p>;
  }

  if (error) {
    return (
      <p className="text-center text-zinc-500">
        Kunde inte ladda texterna just nu.
      </p>
    );
  }

  if (songs.length === 0) {
    return <p className="text-center text-zinc-500">Inga låttexter ännu.</p>;
  }

  if (selectedSong) {
    const showChordToggle = hasChordLines(selectedSong.lyrics);

    return (
      <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-md sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs font-medium text-amber-700 underline underline-offset-4 transition hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
          >
            ← Alla texter
          </button>

          {/* Only offered when the song actually has chord/instruction lines. */}
          {showChordToggle ? (
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                role="switch"
                className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                checked={showChords}
                onChange={(event) => setShowChords(event.target.checked)}
              />
              Visa ackord
            </label>
          ) : null}
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {selectedSong.title}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatSongCredits(selectedSong)}
        </p>

        {/* Plain text on purpose: no markdown, and the chord/lyric
            classification only decides which whole lines to hide. Inline
            chords stay exactly as pasted. `whitespace-pre-wrap` keeps every
            line break and run of spaces while still wrapping long lines. */}
        <pre className="mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {filterLyricLines(selectedSong.lyrics, showChords)}
        </pre>
      </article>
    );
  }

  return (
    <ul className="space-y-3">
      {songs.map((song) => (
        <li key={song.id}>
          <button
            type="button"
            onClick={() => selectSong(song.id)}
            className="w-full rounded-xl border border-transparent bg-white p-4 text-left shadow-md transition hover:border-amber-300 hover:bg-amber-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-zinc-900 dark:hover:border-amber-500/60 dark:hover:bg-amber-500/10"
          >
            <span className="block text-lg font-semibold text-black dark:text-zinc-50">
              {song.title}
            </span>
            <span className="block text-sm text-zinc-600 dark:text-zinc-400">
              {formatSongCredits(song)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
