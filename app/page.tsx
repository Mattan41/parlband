"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/home/Hero";
import SongList from "@/components/home/SongList";
import { toSong, type Song, type SongRow as SongRowData } from "@/data/songs";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-6 px-4 pt-8 pb-32 sm:gap-10 sm:pt-16">
        <Hero />
        <SongList songs={songs} loading={loading} error={error} />
      </main>
    </div>
  );
}
