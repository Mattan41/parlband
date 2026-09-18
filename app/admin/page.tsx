"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NewSongForm from "@/components/admin/NewSongForm";
import SongSection from "@/components/admin/SongSection";
import {
  fetchAdminData,
  type AdminMusician,
  type AdminSong,
} from "@/data/admin";

interface Notice {
  text: string;
  tone: "success" | "error";
}

/**
 * Admin surface for songs, recordings, credits and R2 uploads.
 *
 * The route is protected by Cloudflare Access at the edge (see docs); locally
 * it is deliberately open. This page is a client component because the site is
 * a static export and all data is fetched at runtime from /api/admin/*.
 */
export default function AdminPage() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [musicians, setMusicians] = useState<AdminMusician[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  /**
   * Bumped after every successful reload so the editors remount with fresh
   * server data (their form state is seeded through useState initializers).
   */
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    const data = await fetchAdminData();
    setSongs(data.songs);
    setMusicians(data.musicians);
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchAdminData()
      .then((data) => {
        if (cancelled) return;
        setSongs(data.songs);
        setMusicians(data.musicians);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Kunde inte ladda admin-data"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const notify = useCallback((text: string, tone: "success" | "error") => {
    setNotice({ text, tone });
  }, []);

  const toggle = useCallback((id: string) => {
    setExpanded((previous) => ({ ...previous, [id]: !previous[id] }));
  }, []);

  return (
    <div className="min-h-full flex-1 bg-zinc-100 font-sans dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Pärlband – Admin
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Hantera låtar, inspelningar, medverkande och filer.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-amber-700 underline underline-offset-4 dark:text-amber-400"
          >
            ← Till startsidan
          </Link>
        </header>

        {notice ? (
          <div
            role="status"
            className={`mb-4 rounded-md border px-3 py-2 text-sm ${
              notice.tone === "error"
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="mb-6">
          <NewSongForm onCreated={reload} notify={notify} />
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Laddar…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : songs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Inga låtar ännu.
          </p>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => (
              <SongSection
                key={`${song.id}-${version}`}
                song={song}
                musicians={musicians}
                expanded={Boolean(expanded[song.id])}
                onToggle={() => toggle(song.id)}
                onChanged={reload}
                notify={notify}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
