"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (`public/sw.js`) for PWA/offline support.
 *
 * Renders nothing; mounted once from the root layout. Registration is skipped
 * in development so the dev server is never shadowed by cached assets.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
