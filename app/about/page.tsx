"use client";

import AboutView from "@/components/about/AboutView";
import PublicShell from "@/components/PublicShell";

/**
 * /about – "Om oss".
 *
 * A client route entrypoint, matching app/page.tsx and app/texter/page.tsx so
 * all three public pages follow the same client pattern in the static export
 * (`output: "export"`). The route metadata is owned by the sibling
 * app/about/layout.tsx, because a component marked "use client" cannot export
 * `metadata`.
 */
export default function AboutPage() {
  return (
    <PublicShell>
      <AboutView />
    </PublicShell>
  );
}
