"use client";

import { useEffect, useState } from "react";
import { formatGigDate, formatGigTime, type GigRow } from "@/data/gigs";

/**
 * "Kommande spelningar" – upcoming gigs on the landing page.
 *
 * Renders nothing at all when there are no upcoming dates (or when the request
 * fails): the section is secondary content, so an empty state or an error box
 * would only be noise. Dates are entered at /admin/spelningar.
 *
 * The emerald accent (left bar, heading, date chips) is what tells this section
 * apart from the zinc/amber song cards below it; the colors are contrast-checked
 * for both themes (text >= 4.5:1, the accent bar >= 3:1).
 */
export default function GigList() {
  const [gigs, setGigs] = useState<GigRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/gigs")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load gigs: ${response.status}`);
        }
        return response.json() as Promise<{ gigs: GigRow[] }>;
      })
      .then((data) => {
        if (!cancelled) setGigs(data.gigs);
      })
      .catch((error) => {
        // Deliberately no UI: a missing calendar must not disturb the page.
        console.error("Failed to load gigs", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (gigs.length === 0) return null;

  return (
    <section
      aria-labelledby="upcoming-gigs"
      className="rounded-2xl border border-l-4 border-zinc-200/80 border-l-[#3f5737] bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6 dark:border-zinc-800 dark:border-l-[#5c7a52] dark:bg-zinc-900/50"
    >
      <h2
        id="upcoming-gigs"
        className="text-xs font-semibold uppercase tracking-widest text-[#2f4229] dark:text-[#a3c299]"
      >
        Kommande spelningar
      </h2>

      <ul className="mt-3 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
        {gigs.map((gig) => {
          const time = formatGigTime(gig.start_time);

          return (
            <li
              key={gig.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0"
            >
              <time
                dateTime={gig.event_date}
                className="rounded-md bg-[#eaf0e7] px-2 py-0.5 text-sm font-semibold text-[#1e2e1a] dark:bg-[#253321] dark:text-[#d3e3cd]"
              >
                {formatGigDate(gig.event_date)}
              </time>
              {time ? (
                <span className="text-sm text-zinc-600 dark:text-zinc-300">
                  {time}
                </span>
              ) : null}
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {gig.venue}
                {gig.city ? `, ${gig.city}` : ""}
              </span>
              {gig.info ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {gig.info}
                </span>
              ) : null}
              {gig.ticket_url ? (
                <a
                  href={gig.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs font-medium text-amber-700 underline underline-offset-4 dark:text-amber-400"
                >
                  Biljetter ↗
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
