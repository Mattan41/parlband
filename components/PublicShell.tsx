"use client";

import SiteNav from "./SiteNav";
import type { PublicView } from "./publicView";

interface Props {
  /**
   * `wide` widens the landing view from `lg`: the hero band and the tracklist
   * both span the full container, and the gig calendar will later share the row
   * under the hero with the tracklist. `reading` keeps a comfortable text
   * measure. Both stay at `max-w-2xl` below `sm`, so the single-column
   * (mobile/tablet) layout is unchanged.
   */
  width?: "wide" | "reading";
  /** View currently shown, so the top nav can mark the active tab. */
  activeView: PublicView;
  /** Switches the active view without a route change (app/page.tsx). */
  onSelectView: (view: PublicView) => void;
  children: React.ReactNode;
}

/**
 * Shell for the single public page (`/`): page background, padding and the top
 * navigation. All three public views render through this one shell, which is
 * why the nav state is passed in from app/page.tsx. `/admin` deliberately does
 * not use this – it has its own, denser chrome (see app/admin/page.tsx).
 */
export default function PublicShell({
  width = "reading",
  activeView,
  onSelectView,
  children,
}: Props) {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main
        className={`flex w-full flex-col gap-6 px-4 pt-8 pb-32 sm:gap-10 sm:pt-16 ${
          width === "wide" ? "max-w-2xl lg:max-w-6xl" : "max-w-2xl sm:max-w-3xl"
        }`}
      >
        <SiteNav activeView={activeView} onSelectView={onSelectView} />
        {children}
      </main>
    </div>
  );
}
