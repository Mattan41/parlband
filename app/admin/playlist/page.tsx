"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPage from "@/components/admin/AdminPage";
import PlaylistOrder from "@/components/admin/PlaylistOrder";
import Toasts, { useAdminToasts } from "@/components/admin/Toasts";
import { fetchAdminData, type AdminSong } from "@/data/admin";

/**
 * /admin/playlist – the order songs appear (and play) in on the landing page.
 *
 * It reuses GET /api/admin/songs (which now carries `sort_order`) and writes
 * through PUT /api/admin/playlist. Song-level and recording-level editing stay
 * in Katalog and Inspelningar; this page only owns the order. The route is
 * protected by Cloudflare Access at the edge like the rest of /admin*, and the
 * write endpoint by functions/api/admin/_middleware.ts.
 */
export default function AdminPlaylistPage() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, notify, dismiss } = useAdminToasts();

  /**
   * Written with promise callbacks so no state is set synchronously, which
   * keeps the effect below free of cascading-render warnings (same pattern as
   * app/admin/recordings/page.tsx).
   */
  const load = useCallback(
    () =>
      fetchAdminData()
        .then((data) => {
          setSongs(data.songs);
          setError(null);
        })
        .catch((cause: unknown) => {
          setError(
            cause instanceof Error ? cause.message : "Kunde inte ladda låtarna"
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

  /** Silent refresh after a save; nothing is remounted, so the draft survives. */
  const reload = useCallback(async () => {
    const data = await fetchAdminData();
    setSongs(data.songs);
  }, []);

  return (
    <AdminPage
      subtitle="Bestäm i vilken ordning låtarna visas på startsidan och spelas i spelaren."
      loading={loading}
      error={error}
      onRetry={retry}
      footer={<Toasts toasts={toasts} onDismiss={dismiss} />}
    >
      <PlaylistOrder songs={songs} onSaved={reload} notify={notify} />
    </AdminPage>
  );
}
