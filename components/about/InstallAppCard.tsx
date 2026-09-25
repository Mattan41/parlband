"use client";

import { useSyncExternalStore } from "react";

import {
  canQueryInstalledApps,
  detectPlatform,
  hasInstalledWebApp,
  isChromiumBrowser,
  isStandalone,
  type BeforeInstallPromptEventLike,
  type RelatedAppLike,
} from "./installApp";

/**
 * Card inviting the visitor to install Pärlband as an app, shown on /about.
 *
 * The card stays absent when the site already runs standalone, so it is not
 * offered to someone who has already installed it.
 *
 * The install state is read through `useSyncExternalStore` rather than an
 * effect that calls `setState`. The snapshot is a plain string, the server
 * snapshot is always "hidden", and React swaps to the real value right after
 * hydration - so the statically exported HTML never mismatches, the browser
 * APIs are only touched on the client, and no state is set during an effect.
 *
 * - iOS Safari never fires `beforeinstallprompt`, so the Share-sheet steps are
 *   shown directly instead of a button.
 * - Chromium (Android and desktop Chrome/Edge) fires `beforeinstallprompt`; the
 *   event is captured and replayed from the "Installera app" button. Because
 *   that event is suppressed once the app is installed, the generic browser-menu
 *   hint is withheld on Chromium until the prompt proves it can be installed
 *   from here (see `getSnapshot`).
 * - Firefox and desktop Safari fall back to a short browser-menu hint.
 *
 * `navigator.getInstalledRelatedApps()` is queried once per page session as an
 * authoritative check for an existing installation, so a normal browser tab on a
 * device that already has the app stays hidden. The API is Chromium-only and
 * experimental, which is why the Chromium hint is withheld until the prompt
 * fires rather than trusted on its own.
 */
type ViewState = "hidden" | "ios" | "prompt" | "instructions";

/** Result of the asynchronous installation check. */
type InstalledState = "unknown" | "installed" | "absent";

/** Single-use Chromium prompt; kept outside React so it survives remounts. */
let deferredPrompt: BeforeInstallPromptEventLike | null = null;

/** Installation status from `getInstalledRelatedApps()`, queried once. */
let installedState: InstalledState = "unknown";
let installedCheckStarted = false;

/** On-change callbacks from every mounted card (there is normally just one). */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** `navigator.getInstalledRelatedApps()`, which the TS DOM lib does not declare. */
type NavigatorWithInstalledApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedAppLike[]>;
};

/**
 * Fire the installation query once and record the result. The API is Chromium
 * only, so an unsupported browser simply leaves `installedState` as "unknown",
 * and a rejection (e.g. a non-top-level browsing context) counts as "absent" so
 * the card is not lost.
 */
function checkInstalledApps() {
  if (installedCheckStarted) return;
  installedCheckStarted = true;

  const nav = navigator as NavigatorWithInstalledApps;
  if (!canQueryInstalledApps(nav) || !nav.getInstalledRelatedApps) return;

  void nav.getInstalledRelatedApps
    .call(nav)
    .then((apps) => {
      installedState = hasInstalledWebApp(apps) ? "installed" : "absent";
      emit();
    })
    .catch(() => {
      installedState = "absent";
      emit();
    });
}

/** The server (and the hydration pass) must not guess: render nothing. */
function getServerSnapshot(): ViewState {
  return "hidden";
}

function getSnapshot(): ViewState {
  if (typeof window === "undefined") return "hidden";

  const standalone = isStandalone({
    displayModeStandalone: window.matchMedia("(display-mode: standalone)")
      .matches,
    navigatorStandalone:
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  });
  if (standalone) return "hidden";

  // An installed app is never offered the card, whichever tab it is opened in.
  if (installedState === "installed") return "hidden";
  if (deferredPrompt) return "prompt";

  // iOS never fires `beforeinstallprompt`: the Share sheet is the only way in.
  if (detectPlatform(navigator.userAgent, navigator.maxTouchPoints) === "ios") {
    return "ios";
  }

  // Chromium hardening: `beforeinstallprompt` is suppressed when the app is
  // already installed, so withhold the generic browser-menu hint until the
  // prompt proves the app can actually be installed from here. This also keeps
  // the card hidden while the async installation check is still pending.
  if (isChromiumBrowser(navigator.userAgent)) return "hidden";

  return "instructions";
}

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia("(display-mode: standalone)");

  checkInstalledApps();

  const handleBeforeInstallPrompt = (event: Event) => {
    // Stop Chromium's own mini-infobar; the card's button owns the prompt.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEventLike;
    onStoreChange();
  };
  const handleInstalled = () => {
    deferredPrompt = null;
    installedState = "installed";
    onStoreChange();
  };
  const handleDisplayModeChange = () => onStoreChange();

  listeners.add(onStoreChange);
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleInstalled);
  media.addEventListener("change", handleDisplayModeChange);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.removeEventListener("appinstalled", handleInstalled);
    media.removeEventListener("change", handleDisplayModeChange);
  };
}

export default function InstallAppCard() {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    await prompt.prompt();
    await prompt.userChoice;
    // A prompt object is single-use; once it has been shown the card is done.
    deferredPrompt = null;
    emit();
  };

  if (view === "hidden") return null;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 text-left shadow-sm backdrop-blur-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Spara som app
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Lägg Pärlband på hemskärmen och lyssna som i en app – snabb start och
        utan webbläsarens adressfält.
      </p>

      {view === "prompt" ? (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          Installera app
        </button>
      ) : view === "ios" ? (
        <ol className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-2">
            <span className="font-semibold">1.</span>
            <span>
              Tryck på <strong>Dela-knappen</strong> i Safari (fyrkanten med
              pilen uppåt).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold">2.</span>
            <span>
              Skrolla ned i menyn (tryck eventuellt på <em>Visa mer</em>) och
              välj <strong>&rdquo;Lägg till på hemskärmen&rdquo;</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold">3.</span>
            <span>
              Tryck på <strong>Lägg till</strong> uppe till höger för att
              bekräfta.
            </span>
          </li>
        </ol>
      ) : (
        <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
          Öppna webbläsarens meny och välj &rdquo;Installera&rdquo; eller
          &rdquo;Lägg till på hemskärmen&rdquo;.
        </p>
      )}
    </section>
  );
}
