"use client";

import type { PublicView } from "./publicView";

/** Primary public destinations, in nav order; each maps to a view on `/`. */
const NAV_ITEMS: { view: PublicView; label: string }[] = [
  { view: "lyssna", label: "Lyssna" },
  { view: "texter", label: "Texter" },
  { view: "about", label: "Om oss" },
];

interface Props {
  /** The view currently shown, marked as the active tab. */
  activeView: PublicView;
  /** Switches the view without a route change (app/page.tsx owns the URL). */
  onSelectView: (view: PublicView) => void;
}

/**
 * Top navigation for the public views (components/PublicShell.tsx), so every
 * destination is reachable from any of them. The three destinations are views
 * on the single `/` page rather than routes, so the entries are buttons that
 * ask the page to switch view instead of next/link hrefs; that is what keeps
 * the app-wide player alive across a switch. Any link to the separate /admin
 * route still uses next/link. Styling reuses the pill look from the streaming
 * links, with the amber accent marking the active view.
 */
export default function SiteNav({ activeView, onSelectView }: Props) {
  return (
    <nav aria-label="Huvudmeny" className="flex items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const active = item.view === activeView;

        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onSelectView(item.view)}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              active
                ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500/70 dark:bg-amber-500/10 dark:text-amber-200"
                : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
