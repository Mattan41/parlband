"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import GigsSection from "@/components/admin/GigsSection";
import Toasts, { useAdminToasts } from "@/components/admin/Toasts";
import { secondaryButtonClass } from "@/components/admin/adminStyles";
import { adminGet } from "@/data/admin";
import type { AdminGigRow } from "@/data/gigs";

/**
 * /admin/gigs – the gig calendar ("Kommande spelningar").
 *
 * The route is protected by Cloudflare Access at the edge like the rest of
 * /admin*, and the write endpoints by functions/api/admin/_middleware.ts. The
 * page is a client component because the site is a static export and all data is
 * fetched at runtime.
 */
export default function AdminGigsPage() {
  const [gigs, setGigs] = useState<AdminGigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, notify, dismiss } = useAdminToasts();

  /**
   * Written with promise callbacks so no state is set synchronously, which
   * keeps the effect below free of cascading-render warnings (same pattern as
   * app/admin/page.tsx).
   */
  const load = useCallback(
    () =>
      adminGet<{ gigs: AdminGigRow[] }>("/api/admin/gigs")
        .then((data) => {
          setGigs(data.gigs);
          setError(null);
        })
        .catch((cause: unknown) => {
          setError(
            cause instanceof Error
              ? cause.message
              : "Kunde inte ladda spelningarna"
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
              Kommande spelningar på startsidan.
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
        ) : (
          <GigsSection gigs={gigs} onChanged={load} notify={notify} />
        )}

        <Toasts toasts={toasts} onDismiss={dismiss} />
      </main>
    </div>
  );
}
