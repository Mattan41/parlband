"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPage from "@/components/admin/AdminPage";
import GigsSection from "@/components/admin/GigsSection";
import Toasts, { useAdminToasts } from "@/components/admin/Toasts";
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
    <AdminPage
      subtitle="Kommande spelningar på startsidan."
      loading={loading}
      error={error}
      onRetry={retry}
      footer={<Toasts toasts={toasts} onDismiss={dismiss} />}
    >
      <GigsSection gigs={gigs} onChanged={load} notify={notify} />
    </AdminPage>
  );
}
