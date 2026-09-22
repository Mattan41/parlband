"use client";

import SiteNav from "./SiteNav";

interface Props {
  /**
   * `wide` widens the landing page from `lg`: the hero band and the tracklist
   * both span the full container, and the gig calendar will later share the row
   * under the hero with the tracklist. `reading` keeps a comfortable text
   * measure. Both stay at `max-w-2xl` below `sm`, so the single-column
   * (mobile/tablet) layout is unchanged.
   */
  width?: "wide" | "reading";
  children: React.ReactNode;
}

/**
 * Shared shell for the public pages: page background, padding and the top
 * navigation. `/admin` deliberately does not use this – it has its own, denser
 * chrome (see app/admin/page.tsx).
 */
export default function PublicShell({ width = "reading", children }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main
        className={`flex w-full flex-col gap-6 px-4 pt-8 pb-32 sm:gap-10 sm:pt-16 ${
          width === "wide" ? "max-w-2xl lg:max-w-6xl" : "max-w-2xl sm:max-w-3xl"
        }`}
      >
        <SiteNav />
        {children}
      </main>
    </div>
  );
}
