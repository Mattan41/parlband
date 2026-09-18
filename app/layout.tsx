import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: "/icon.png",
    apple: "/icon.png",
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
      </body>
    </html>
  );
}
