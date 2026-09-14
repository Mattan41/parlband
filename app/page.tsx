"use client";

import AudioPlayer from "@/components/AudioPlayer";
import songs from "@/data/songs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-10 px-4 py-16">
        <header className="text-center">
          <h1 className="text-6xl font-bold tracking-tight text-zinc-900 sm:text-7xl dark:text-zinc-50">
            Pärlband
          </h1>
          <img
              src={`${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/parlband.jpg`}
              alt="Pärlband"
              className="my-6 w-full rounded-2xl object-cover shadow-md"
          />
          <h2 className="text-sm font-medium tracking-wide text-zinc-600 dark:text-zinc-400">
            <span className="inline-block whitespace-nowrap">Örjan Ahnoff</span>
            <span className="mx-2 text-zinc-400 dark:text-zinc-600">·</span>
            <span className="inline-block whitespace-nowrap">Mats Kruskopf Eriksson</span>
            <span className="mx-2 text-zinc-400 dark:text-zinc-600">·</span>
            <span className="inline-block whitespace-nowrap">Nova Kruskopf Eriksson</span>
          </h2>
            <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white/70 p-6 text-left shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Välkommen!
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Vi håller på att bygga upp den här sidan.
                Ni hittar ni oss även här:
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                    href="https://parlband.bandcamp.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Bandcamp ↗
                </a>
                <a
                    href="https://www.youtube.com/@P%C3%A4rlband-b2n"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  YouTube ↗
                </a>
                <a
                    href="https://soundcloud.com/user-212532667"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  SoundCloud ↗
                </a>
                <a
                  href="https://www.facebook.com/share/1FBmEozujF/"
                  target={"_blank"}
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Facebook ↗
                </a>
              </div>
              
              <p className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                Kontakt:{" "}
                <a
                    href="mailto:parlbandet@gmail.com"
                    className="font-medium text-zinc-900 underline underline-offset-4 hover:text-black dark:text-zinc-200 dark:hover:text-white"
                >
                  parlbandet@gmail.com
                </a>
              </p>
            </div>

            <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
