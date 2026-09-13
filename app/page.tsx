"use client";

import AudioPlayer from "@/components/AudioPlayer";
import songs from "@/data/songs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-8 px-4 py-16">
        <header className="text-center">
          <h1 className="text-8xl font-bold text-black dark:text-zinc-50">
            Pärlband
          </h1>
          <img
              src={`${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/parlband.jpg`}
              alt="Pärlband"
              className="mb-6 w-full rounded-xl object-cover shadow-md"
          />
          <h2 className="text-1xl font-bold text-black dark:text-zinc-50">
            Örjan Ahnoff · Mats Kruskopf Eriksson · Nova Kruskopf Eriksson
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Våra låtar
          </p>
        </header>

        {songs.length === 0 ? (
          <p className="text-center text-zinc-500">No songs yet.</p>
        ) : (
          <div className="space-y-6">
            {songs.map((song) => (
              <AudioPlayer key={song.id} song={song} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
