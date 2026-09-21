"use client";

import Image from "next/image";

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
 * On mobile the hero fills the first viewport minus the chrome above it, and the
 * welcome line + scroll hint are pushed to the bottom with `mt-auto` so they sit
 * just above the fold instead of being hidden below the image. The chrome is
 * `--site-nav-height` (components/SiteNav.tsx, see globals.css) plus 3.5rem for
 * the shell's `pt-8` (2rem) and `gap-6` (1.5rem) – keep those values in sync
 * with components/PublicShell.tsx. Both image caps (`max-h-[24svh]` and
 * `sm:max-h-[45svh]`) exist to protect that budget: the hero spans the full wide
 * container, so an uncapped `aspect-video` image would be taller than a laptop
 * viewport on its own. `svh` (small viewport height) is used instead of `dvh` to
 * avoid the layout shifting as the mobile URL bar shows/hides.
 *
 * From `sm` up the natural height is kept (`sm:min-h-0`), so the hint ends the
 * hero instead of being pinned to a stretched one.
 *
 * The "Ni hittar oss även här" card lives on /about; drop
 * `components/StreamingLinks.tsx` in here (or in app/page.tsx) to show it on the
 * landing page again.
 */
export default function Hero({ welcomeText }: Props) {
  return (
    <header className="flex min-h-[calc(100svh-var(--site-nav-height)-3.5rem)] flex-col text-center sm:min-h-0">
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

      {/* Welcome line + scroll hint share the bottom of the first mobile
          viewport via mt-auto. The label carries the id the tracklist section
          is labelled by (aria-labelledby in app/page.tsx) and the whole block
          jumps to it, past the "Kommande spelningar" section.

          The welcome line is edited at /admin/about (key `welcome_text`); an
          empty value renders nothing at all, there is no fallback text here. */}
      <div className="mt-auto pt-6 sm:pt-8">
        {welcomeText.trim() !== "" ? (
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-300">
            {welcomeText}
          </p>
        ) : null}

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
