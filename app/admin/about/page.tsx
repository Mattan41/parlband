"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPage from "@/components/admin/AdminPage";
import ContentEditor from "@/components/admin/ContentEditor";
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
    <AdminPage
      subtitle="Redigera välkomsttexten på startsidan samt rubriken och texten på Om oss-sidan."
      loading={loading}
      error={error}
      onRetry={retry}
    >
      {content ? <ContentEditor initialContent={content} /> : null}
    </AdminPage>
  );
}
