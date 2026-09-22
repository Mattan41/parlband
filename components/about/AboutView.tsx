"use client";

import { useEffect, useState } from "react";
import StreamingLinks from "@/components/StreamingLinks";
import { DEFAULT_ABOUT_HEADING, fetchSiteContent } from "@/data/content";

/**
 * /about – "Om oss".
 *
 * The heading and the body copy are edited in the admin (/admin/about) and
 * fetched at runtime from GET /api/content; the streaming links (the same
 * components/StreamingLinks.tsx card as on the landing page) are static. The
 * route has no dynamic segments, so the static export has no data at build time
 * and the fetch has to happen on the client.
 *
 * An empty heading falls back to DEFAULT_ABOUT_HEADING and an empty body renders
 * nothing. The document title stays "Om oss – Pärlband" (app/about/page.tsx):
 * a static export cannot read the heading at build time.
 */
export default function AboutView() {
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSiteContent()
      .then((content) => {
        if (cancelled) return;
        setHeading(content.aboutHeading);
        setBody(content.aboutBody);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* While the fetch is in flight (and for an emptied heading) the built-in
     default shows, so the h1 is never missing. */
  const title = heading.trim() !== "" ? heading : DEFAULT_ABOUT_HEADING;

  return (
    <article className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          {title}
        </h1>
      </header>

      {loading ? (
        <p className="text-center text-zinc-500">Laddar…</p>
      ) : error ? (
        <p className="text-center text-zinc-500">
          Kunde inte ladda texten just nu.
        </p>
      ) : body.trim() !== "" ? (
        /* Plain text on purpose, like the lyrics view: line breaks are kept,
           nothing is interpreted as markup. */
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {body}
        </p>
      ) : null}

      <StreamingLinks />
    </article>
  );
}
