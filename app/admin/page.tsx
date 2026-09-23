"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import NewSongForm from "@/components/admin/NewSongForm";
import NewRecordingModal from "@/components/admin/NewRecordingModal";
import SongSection from "@/components/admin/SongSection";
import MusicianOverview from "@/components/admin/MusicianOverview";
import Toasts, { useAdminToasts } from "@/components/admin/Toasts";
import { secondaryButtonClass } from "@/components/admin/adminStyles";
import {
  AdminApiError,
  adminGet,
  fetchAdminData,
  type AdminData,
  type AdminMusician,
  type AdminSong,
} from "@/data/admin";

interface LoadError {
  text: string;
  /** True when the session is gone (401/403) – retrying cannot help. */
  auth: boolean;
}

function isAuthError(cause: unknown): boolean {
  return (
    cause instanceof AdminApiError &&
    (cause.status === 401 || cause.status === 403)
  );
}

/**
 * Swedish message for a failed admin request, tuned for the two common causes.
 * A `TypeError` (fetch rejected) covers both an offline browser and the
 * cross-origin redirect Cloudflare Access sends when the session expired.
 */
function describeLoadError(cause: unknown): LoadError {
  if (isAuthError(cause)) {
    return { text: "Sessionen har gått ut – logga in igen.", auth: true };
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof AdminApiError && cause.status === 0)
  ) {
    return {
      text: "Kunde inte nå admin-API:t – nätverket saknas eller så har sessionen gått ut. Försök igen eller ladda om sidan.",
      auth: false,
    };
  }
  return { text: "Kunde inte ladda admin-data. Försök igen.", auth: false };
}

const RETRY_DELAY_MS = 800;

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
  /** Id of the single expanded song, or null when all are collapsed. */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  /** Song whose "new recording" modal is open, or null when it is closed. */
  const [recordingSongId, setRecordingSongId] = useState<string | null>(null);
  /** The single expanded recording card, or null when all are collapsed. */
  const [openRecordingId, setOpenRecordingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const { toasts, notify, dismiss: dismissToast } = useAdminToasts();

  const applyData = useCallback((data: AdminData) => {
    setSongs(data.songs);
    setMusicians(data.musicians);
  }, []);

  /**
   * Full load with one automatic retry for transient failures. An expired
   * session is never retried – it needs the user to sign in again.
   */
  /**
   * Fetch once, retry once for transient failures. Written with promise
   * callbacks so no state is set synchronously (which keeps the effect below
   * free of cascading-render warnings).
   */
  const loadData = useCallback(() => {
    const attempt = () =>
      fetchAdminData().then(
        (data) => {
          applyData(data);
          setLoadError(null);
        },
        (cause: unknown) => {
          if (isAuthError(cause)) {
            setLoadError(describeLoadError(cause));
            return;
          }
          return new Promise<void>((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS)
          )
            .then(() => fetchAdminData())
            .then(
              (data) => {
                applyData(data);
                setLoadError(null);
              },
              (retryCause: unknown) => {
                setLoadError(describeLoadError(retryCause));
              }
            );
        }
      );

    return attempt().finally(() => setLoading(false));
  }, [applyData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /** Manual retry from the error state; the click sets its own feedback. */
  const retry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void loadData();
  }, [loadData]);

  /**
   * Silent refresh after a mutation. It only replaces the data props; nothing
   * is remounted, so unsaved drafts survive a reload.
   */
  const reload = useCallback(async () => {
    applyData(await fetchAdminData());
  }, [applyData]);

  /** Refresh just the musician list, e.g. after creating one from a credit. */
  const refreshMusicians = useCallback(async () => {
    const data = await adminGet<{ musicians: AdminMusician[] }>(
      "/api/admin/musicians"
    );
    setMusicians(data.musicians);
  }, []);

  /** Only one song is expanded at a time. */
  const toggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  /** After creating a song, expand it so adding a recording is the next step. */
  const handleSongCreated = useCallback(
    async (songId: string) => {
      setExpandedId(songId);
      await reload();
    },
    [reload]
  );

  /** After deleting a song, close whatever belonged to it and refresh. */
  const handleSongDeleted = useCallback(
    async (songId: string) => {
      const deleted = songs.find((song) => song.id === songId);
      const openRecordingBelonged =
        deleted !== undefined &&
        openRecordingId !== null &&
        deleted.recordings.some(
          (recording) => recording.id === openRecordingId
        );

      setExpandedId((current) => (current === songId ? null : current));
      setRecordingSongId((current) => (current === songId ? null : current));
      if (openRecordingBelonged) setOpenRecordingId(null);
      await reload();
    },
    [songs, openRecordingId, reload]
  );

  /** After creating a recording, expand its card. */
  const handleRecordingCreated = useCallback((recordingId: number) => {
    setOpenRecordingId(recordingId);
  }, []);

  const recordingSong = useMemo(
    () => songs.find((song) => song.id === recordingSongId) ?? null,
    [songs, recordingSongId]
  );

  return (
    <div className="min-h-full flex-1 bg-zinc-100 font-sans dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
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

        <div className="mb-6">
          <NewSongForm onCreated={handleSongCreated} notify={notify} />
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Laddar…</p>
        ) : loadError ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-600 dark:text-red-400">
              {loadError.text}
            </p>
            {loadError.auth ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => window.location.reload()}
              >
                Ladda om
              </button>
            ) : (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={retry}
              >
                Försök igen
              </button>
            )}
          </div>
        ) : songs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Inga låtar ännu.
          </p>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => (
              <SongSection
                key={song.id}
                song={song}
                musicians={musicians}
                expanded={expandedId === song.id}
                onToggle={() => toggle(song.id)}
                onAddRecording={() => setRecordingSongId(song.id)}
                onDeleted={() => void handleSongDeleted(song.id)}
                openRecordingId={openRecordingId}
                onOpenRecording={setOpenRecordingId}
                onMusiciansChanged={refreshMusicians}
                onChanged={reload}
                notify={notify}
              />
            ))}
          </div>
        )}

        {!loading && !loadError ? (
          <MusicianOverview
            songs={songs}
            musicians={musicians}
            onMusiciansChanged={refreshMusicians}
            onChanged={reload}
          />
        ) : null}

        <NewRecordingModal
          song={recordingSong}
          musicians={musicians}
          onClose={() => setRecordingSongId(null)}
          onCreated={handleRecordingCreated}
          onMusiciansChanged={refreshMusicians}
          onChanged={reload}
          notify={notify}
        />

        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </main>
    </div>
  );
}
