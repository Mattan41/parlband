"use client";

import { useEffect, useState } from "react";
import GigList from "@/components/home/GigList";
import Hero from "@/components/home/Hero";
import SongList from "@/components/home/SongList";
import PublicShell from "@/components/PublicShell";
import { fetchSiteContent } from "@/data/content";
import { toSong, type Song, type SongRow as SongRowData } from "@/data/songs";

export default function Home() {
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

  return (
    <PublicShell width="wide">
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

      {/* components/StreamingLinks.tsx ("Ni hittar oss även här" + contact) is
          used on /about. Add <StreamingLinks /> here to show it on the landing
          page as well. */}
    </PublicShell>
  );
}
