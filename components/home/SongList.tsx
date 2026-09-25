"use client";

import { useEffect } from "react";
import SongRow from "@/components/SongRow";
import { usePlayerStore } from "@/store/playerStore";
import type { Song } from "@/data/songs";

interface Props {
  songs: Song[];
  loading: boolean;
  error: boolean;
}

/**
 * Renders the landing-page song list. The data itself is owned by
 * app/page.tsx (single fetch); this component only handles the loading/error/
 * empty states and maps each song to a <SongRow>.
 *
 * It also mirrors the list into the player store as the active catalog, so the
 * sticky player can keep playing (looping through the list) once the manual
 * queue runs out. The effect sits above the early returns so the catalog stays
 * in sync in every state; it is intentionally not cleared on unmount, so
 * playback keeps looping while the visitor is on another route.
 */
export default function SongList({ songs, loading, error }: Props) {
  const setCatalog = usePlayerStore((state) => state.setCatalog);

  useEffect(() => {
    setCatalog(songs);
  }, [songs, setCatalog]);

  if (loading) {
    return <p className="text-center text-zinc-500">Laddar låtar…</p>;
  }

  if (error) {
    return (
      <p className="text-center text-zinc-500">
        Kunde inte ladda låtarna just nu.
      </p>
    );
  }

  if (songs.length === 0) {
    return <p className="text-center text-zinc-500">No songs yet.</p>;
  }

  return (
    <div className="space-y-6">
      {songs.map((song) => (
        <SongRow key={song.id} song={song} />
      ))}
    </div>
  );
}
