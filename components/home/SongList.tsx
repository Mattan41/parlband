"use client";

import SongRow from "@/components/SongRow";
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
 */
export default function SongList({ songs, loading, error }: Props) {
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
