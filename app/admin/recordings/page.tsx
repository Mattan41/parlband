"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPage from "@/components/admin/AdminPage";
import RecordingList from "@/components/admin/RecordingList";
import Toasts, { useAdminToasts } from "@/components/admin/Toasts";
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
    <AdminPage
      subtitle="Alla inspelningar i en platt lista. Redigera inspelningen här; låtens text, noter och publicering redigeras i Katalog."
      loading={loading}
      error={error}
      onRetry={retry}
      footer={<Toasts toasts={toasts} onDismiss={dismiss} />}
    >
      <RecordingList
        songs={songs}
        musicians={musicians}
        onChanged={reload}
        onMusiciansChanged={refreshMusicians}
        notify={notify}
      />
    </AdminPage>
  );
}
