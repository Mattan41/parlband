"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AboutView from "@/components/about/AboutView";
import GigList from "@/components/home/GigList";
import Hero from "@/components/home/Hero";
import SongList from "@/components/home/SongList";
import PublicShell from "@/components/PublicShell";
import { readPublicView, type PublicView } from "@/components/publicView";
import TexterView from "@/components/texter/TexterView";
import { fetchSiteContent } from "@/data/content";
import { toSong, type Song, type SongRow as SongRowData } from "@/data/songs";

/**
 * The single public page.
 *
 * `/`, `/texter` and `/about` used to be three real routes; they are now three
 * views on this one page (a pure SPA) so switching between them never triggers
 * a route change. Even a client-side navigation behind next/link turned out to
 * make the app-wide <StickyPlayer> lose its state on mobile Chrome and in the
 * installed PWA, while the player and its Zustand store are mounted once in
 * app/layout.tsx, outside {children}. Only /admin is still a genuine route.
 *
 * The URL stays the source of truth for which view is shown (`?view=`, or
 * `?song=` for a specific lyric), so shared links and reloads keep working;
 * the switch itself is a `router.replace` on the same route.
 *
 * `useSearchParams` below forces its subtree to be client-side rendered during
 * the static export, so the closest <Suspense> boundary is required, not
 * cosmetic.
 */
export default function Home() {
  return (
    <Suspense fallback={<PublicLoading />}>
      <PublicPage />
    </Suspense>
  );
}

function PublicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = readPublicView(searchParams);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");

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
        setSongs(rows.map(toSong).filter((song) => song.src !== ""));
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

  /**
   * The welcome line is edited at /admin/about. It is fetched separately from
   * the songs so a failing songs request does not hide it (and vice versa); on
   * failure the hero simply renders without the line.
   */
  useEffect(() => {
    let cancelled = false;

    fetchSiteContent()
      .then((content) => {
        if (!cancelled) setWelcomeText(content.welcomeText);
      })
      .catch((cause: unknown) => {
        console.error("Failed to load site content", cause);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Switch the visible view without leaving `/`: the query string carries the
   * choice (so it survives a reload or a shared link) and `replace` keeps the
   * switch out of the history stack, the same way the song selection does.
   */
  function showView(view: PublicView) {
    router.replace(view === "lyssna" ? "/" : `/?view=${view}`, {
      scroll: false,
    });
  }

  return (
    <PublicShell
      /* The landing view keeps its wide tracklist; the two text views were
         `reading` before the merge, so they keep their comfortable measure. */
      width={activeView === "lyssna" ? "wide" : "reading"}
      activeView={activeView}
      onSelectView={showView}
    >
      {activeView === "lyssna" ? (
        <>
          <Hero welcomeText={welcomeText} />

          {/* Renders nothing until the band adds a date in /admin/gigs. */}
          <GigList />

          {/* The hero's "Lyssna" hint jumps here, past "Kommande spelningar".
              scroll-mt keeps the anchor clear of any future sticky bar. */}
          <section
            id="songlist"
            aria-labelledby="listen-hint"
            className="scroll-mt-8"
          >
            <SongList songs={songs} loading={loading} error={error} />
          </section>

          {/* components/StreamingLinks.tsx ("Ni hittar oss även här" + contact)
              is part of the "Om oss" view. Add <StreamingLinks /> here to show
              it on the landing view as well. */}
        </>
      ) : activeView === "texter" ? (
        <TexterView />
      ) : (
        <AboutView />
      )}
    </PublicShell>
  );
}

/**
 * Static-export fallback for the Suspense boundary above: shown until the
 * client tree (and the query string it reads) is ready. Mirrors the shell's
 * background and container so the first paint does not flash white.
 */
function PublicLoading() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-6 px-4 pt-8 pb-32 sm:gap-10 sm:pt-16 lg:max-w-6xl">
        <p className="text-center text-zinc-500">Laddar…</p>
      </main>
    </div>
  );
}
