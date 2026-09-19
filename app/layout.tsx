import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import StickyPlayer from "@/components/StickyPlayer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bandImageUrl = `${process.env.NEXT_PUBLIC_AUDIO_BASE_URL}/parlband/images/parlband.jpg`;

export const metadata: Metadata = {
  verification: {
    google: "8yoGR-_zyJpBOkn1gmVkHu1ilknFjHVvqtJDmG4Lem8",
  },
  title: "Pärlband",
  description: "Officiell hemsida för Pärlband – musik, låttexter och ackord.",
  metadataBase: new URL("https://parlband.kruskopf.org"),
  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icon.png",
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    title: "Pärlband",
    description:
      "Officiell hemsida för Pärlband – musik, låttexter och ackord.",
    url: "https://parlband.kruskopf.org",
    siteName: "Pärlband",
    locale: "sv_SE",
    type: "website",
    images: [
      {
        url: bandImageUrl,
        alt: "Pärlband",
      },
    ],
  },
};

// `themeColor` lives on the viewport export in Next 16, not in `metadata`.
// Matches the PWA icon background so the mobile browser chrome blends in.
export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* App-wide player: mounted once here so audio survives route changes. */}
        <StickyPlayer />
        {/* Registers the PWA service worker (production only, no UI). */}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
