"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import ContentEditor from "@/components/admin/ContentEditor";
import { secondaryButtonClass } from "@/components/admin/adminStyles";
import { fetchSiteContent, type SiteContent } from "@/data/content";

/**
 * Admin editor for the editable page copy: the welcome line on the landing page
 * and the heading + body of /about.
 *
 * The route is protected by Cloudflare Access at the edge like /admin itself,
 * and the write endpoint by functions/api/admin/_middleware.ts. The content is
 * read through the public GET /api/content, since the static export has no data
 * at build time.
 */
export default function AdminAboutPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Written with promise callbacks so no state is set synchronously, which
   * keeps the effect below free of cascading-render warnings (same pattern as
   * app/admin/page.tsx).
   */
  const load = useCallback(
    () =>
      fetchSiteContent()
        .then((data) => {
          setContent(data);
          setError(null);
        })
        .catch((cause: unknown) => {
          setError(
            cause instanceof Error ? cause.message : "Kunde inte ladda texterna"
          );
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Manual retry from the error state; the click sets its own feedback. */
  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void load();
  }, [load]);

  return (
    <div className="min-h-full flex-1 bg-zinc-100 font-sans dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Pärlband – Admin
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Redigera välkomsttexten på startsidan samt rubriken och texten på
              Om oss-sidan.
            </p>
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-700 underline underline-offset-4 dark:text-amber-400"
          >
            Öppna startsida i ny flik ↗
          </Link>
        </header>

        <div className="mb-6">
          <AdminNav />
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Laddar…</p>
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={retry}
            >
              Försök igen
            </button>
          </div>
        ) : content ? (
          <ContentEditor initialContent={content} />
        ) : null}
      </main>
    </div>
  );
}
