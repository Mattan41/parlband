"use client";

import Image from "next/image";
import { CONTACT_EMAIL } from "@/data/siteLinks";

interface Props {
  /** Editable welcome line (site_content key `welcome_text`); may be empty. */
  welcomeText: string;
}

/**
 * Landing-page hero: band name, cover image, credits, a short welcome line and
 * the scroll hint that jumps to the tracklist.
 *
 * The welcome line comes from GET /api/content and is edited at /admin/about;
 * an empty value hides it entirely (no fallback text in code).
 *
 * The hero keeps its natural height on every breakpoint: there is deliberately
 * no `min-h` based on `100svh` and no `mt-auto`, because the forced full-screen
 * height used to stretch the hero and leave a large void on mobile between the
 * band members and the welcome line. The welcome line now follows the credits
 * with a modest gap (`mt-4 sm:mt-6`), so the top of "Kommande spelningar" /
 * the tracklist naturally peeks above the fold.
 *
 * Both image caps (`max-h-[24svh]` and `sm:max-h-[45svh]`) are kept so the wide
 * `aspect-video` frame cannot dominate the screen on its own – the hero spans
 * the full wide container, so an uncapped image would fill a laptop viewport.
 * `svh` (small viewport height) is used instead of `dvh` to avoid the layout
 * shifting as the mobile URL bar shows/hides.
 *
 * The "Ni hittar oss även här" card lives on /about; drop
 * `components/StreamingLinks.tsx` in here (or in app/page.tsx) to show it on the
 * landing page again.
 */
export default function Hero({ welcomeText }: Props) {
  return (
    <header className="flex flex-col text-center">
      <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-7xl dark:text-zinc-50">
        Pärlband
      </h1>

      <div className="relative my-4 aspect-4/3 max-h-[24svh] w-full overflow-hidden rounded-2xl shadow-md sm:my-6 sm:aspect-video sm:max-h-[45svh]">
        <Image
          src={`${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/parlband.jpg`}
          alt="Pärlband"
          fill
          /* The source is 4:3 and the frame is much wider, so `object-cover`
             crops top and bottom. The three faces sit around 19–26% from the
             top of the photo, which a centered crop (31–68%) cuts off, so the
             focus is raised instead. Keep this in sync with the source photo. */
          className="object-cover object-[50%_15%]"
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

      {/* Welcome line + scroll hint follow the credits with a modest gap. The
          label carries the id the tracklist section is labelled by
          (aria-labelledby in app/page.tsx) and the whole block jumps to it, past
          the "Kommande spelningar" section.

          The welcome line is edited at /admin/about (key `welcome_text`); an
          empty value renders nothing at all, there is no fallback text here.
          `whitespace-pre-line` keeps the line breaks the band typed, matching the
          Om oss-text on /about. */}
      <div className="mt-4 sm:mt-6">
        {welcomeText.trim() !== "" ? (
          <p className="mx-auto max-w-xl whitespace-pre-line text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-300">
            {welcomeText.trim()}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
          kontakt:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-zinc-900 underline underline-offset-4 transition hover:text-black dark:text-zinc-200 dark:hover:text-white"
          >
            {CONTACT_EMAIL}
          </a>
        </p>

        <a
          href="#songlist"
          className="mt-4 flex flex-col items-center text-zinc-400 transition hover:text-zinc-600 sm:mt-6 dark:text-zinc-600 dark:hover:text-zinc-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 animate-bounce"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          <span
            id="listen-hint"
            className="mt-1 text-xs font-semibold uppercase tracking-widest"
          >
            Lyssna
          </span>
        </a>
      </div>
    </header>
  );
}
