import type { Metadata } from "next";
import AboutView from "@/components/about/AboutView";
import PublicShell from "@/components/PublicShell";

/**
 * /about – "Om oss".
 *
 * Kept as a server component so the route can own its metadata; the actual
 * content is client-fetched by <AboutView> because the static export has no
 * data at build time (same pattern as /texter).
 */
export const metadata: Metadata = {
  title: "Om oss – Pärlband",
  description:
    "Om Pärlband – bandet bakom musiken, och var du hittar oss på streamingtjänsterna.",
  openGraph: {
    title: "Om oss – Pärlband",
    description:
      "Om Pärlband – bandet bakom musiken, och var du hittar oss på streamingtjänsterna.",
    url: "https://parlband.kruskopf.org/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <PublicShell>
      <AboutView />
    </PublicShell>
  );
}
