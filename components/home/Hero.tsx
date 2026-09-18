"use client";

import Image from "next/image";

/**
 * Landing-page hero: band name, cover image, credits, welcome card and the
 * scroll hint that anchors to the "Lyssna" section.
 *
 * On mobile the whole block occupies (at least) the first viewport minus the
 * main padding, and the scroll hint is pushed to the bottom with `mt-auto`, so
 * the "Lyssna" anchor stays above the fold instead of being hidden below the
 * tall image + welcome card. `svh` (small viewport height) is used instead of
 * `dvh` to avoid the layout shifting as the mobile URL bar shows/hides. From
 * `sm` up the natural height is kept (`sm:min-h-0`), so desktop does not get a
 * stretched hero with a large empty gap.
 */
export default function Hero() {
  return (
    <header className="flex min-h-[calc(100svh-4rem)] flex-col text-center sm:min-h-0">
      <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-7xl dark:text-zinc-50">
        Pärlband
      </h1>

      <div className="relative my-4 aspect-4/3 max-h-[30svh] w-full overflow-hidden rounded-2xl shadow-md sm:my-6 sm:aspect-video sm:max-h-none">
        <Image
          src={`${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/parlband.jpg`}
          alt="Pärlband"
          fill
          className="object-cover"
          priority
        />
      </div>

      <h2 className="text-xs font-medium tracking-wide text-zinc-600 sm:text-sm dark:text-zinc-400">
        <span className="inline-block whitespace-nowrap">Örjan Ahnoff</span>
        <span className="mx-2 text-zinc-400 dark:text-zinc-600">·</span>
        <span className="inline-block whitespace-nowrap">
          Mats Kruskopf Eriksson
        </span>
        <span className="mx-2 text-zinc-400 dark:text-zinc-600">·</span>
        <span className="inline-block whitespace-nowrap">
          Nova Kruskopf Eriksson
        </span>
      </h2>

      <div className="mt-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-3 text-left shadow-sm backdrop-blur-sm sm:mt-8 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Välkommen!
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Vi håller på att bygga upp den här sidan. Ni hittar ni oss även här:
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

      {/* pinned to the bottom of the first viewport via mt-auto */}
      <div className="mt-auto pt-3 sm:pt-6">
        <a
          href="#lyssna"
          aria-label="Scrolla ner till låtarna"
          className="flex animate-bounce justify-center text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>

        <p
          id="lyssna"
          className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
        >
          Lyssna
        </p>
      </div>
    </header>
  );
}
