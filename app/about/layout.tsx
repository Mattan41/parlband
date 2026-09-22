import type { Metadata } from "next";

/**
 * /about – "Om oss".
 *
 * A server layout owns the route metadata because app/about/page.tsx is a
 * client component (a "use client" module cannot export `metadata`). The layout
 * itself renders nothing extra: it only exists so the client page can follow the
 * same pattern as the other public pages.
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

export default function AboutLayout({ children }: LayoutProps<"/about">) {
  return children;
}
