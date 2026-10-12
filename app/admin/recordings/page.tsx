"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import RecordingList from "@/components/admin/RecordingList";
import Toasts, { useAdminToasts } from "@/components/admin/Toasts";
import { secondaryButtonClass } from "@/components/admin/adminStyles";
import {
  adminGet,
  fetchAdminData,
  type AdminMusician,
  type AdminSong,
} from "@/data/admin";

/**
 * /admin/recordings – a flat, mobile-friendly list of every recording.
 *
 * It reuses GET /api/admin/songs (all songs with their recordings) and edits a
 * recording through the same components/admin/RecordingCard.tsx as the Katalog
 * view. Song-level fields and creating a new recording stay in Katalog; each row
 * links there. The route is protected by Cloudflare Access at the edge like the
 * rest of /admin*, and the write endpoints by functions/api/admin/_middleware.ts.
 */
export default function AdminRecordingsPage() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [musicians, setMusicians] = useState<AdminMusician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, notify, dismiss } = useAdminToasts();

  /**
   * Written with promise callbacks so no state is set synchronously, which
   * keeps the effect below free of cascading-render warnings (same pattern as
   * app/admin/gigs/page.tsx).
   */
  const load = useCallback(
    () =>
      fetchAdminData()
        .then((data) => {
          setSongs(data.songs);
          setMusicians(data.musicians);
          setError(null);
        })
        .catch((cause: unknown) => {
          setError(
            cause instanceof Error
              ? cause.message
              : "Kunde inte ladda inspelningarna"
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

  /** Silent refresh after a mutation; nothing is remounted, so drafts survive. */
  const reload = useCallback(async () => {
    const data = await fetchAdminData();
    setSongs(data.songs);
    setMusicians(data.musicians);
  }, []);

  /** Refresh just the musician list, e.g. after creating one from a credit. */
  const refreshMusicians = useCallback(async () => {
    const data = await adminGet<{ musicians: AdminMusician[] }>(
      "/api/admin/musicians"
    );
    setMusicians(data.musicians);
  }, []);

  return (
    <div className="min-h-full flex-1 bg-zinc-100 font-sans dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Pärlband – Admin
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Alla inspelningar i en platt lista. Redigera inspelningen här;
              låtens text, noter och publicering redigeras i Katalog.
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
          <RecordingList
            songs={songs}
            musicians={musicians}
            onChanged={reload}
            onMusiciansChanged={refreshMusicians}
            notify={notify}
          />
        )}

        <Toasts toasts={toasts} onDismiss={dismiss} />
      </main>
    </div>
  );
}
