"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPage from "@/components/admin/AdminPage";
import SettingsEditor from "@/components/admin/SettingsEditor";
import { fetchSiteSettings, type SiteSettings } from "@/data/settings";

/**
 * Admin view for the site-wide settings, currently the sticky player's
 * end-of-queue behaviour.
 *
 * The route is protected by Cloudflare Access at the edge like the rest of
 * /admin*, and the write endpoint by functions/api/admin/_middleware.ts. The
 * settings are read through the public GET /api/settings, since the static
 * export has no data at build time.
 */
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Written with promise callbacks so no state is set synchronously, which
   * keeps the effect below free of cascading-render warnings (same pattern as
   * app/admin/page.tsx).
   */
  const load = useCallback(
    () =>
      fetchSiteSettings()
        .then((data) => {
          setSettings(data);
          setError(null);
        })
        .catch((cause: unknown) => {
          setError(
            cause instanceof Error
              ? cause.message
              : "Kunde inte ladda inställningarna"
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
      subtitle="Inställningar för hemsidan."
      loading={loading}
      error={error}
      onRetry={retry}
    >
      {settings ? <SettingsEditor initialSettings={settings} /> : null}
    </AdminPage>
  );
}
