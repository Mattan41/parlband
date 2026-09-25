/**
 * Pure detection helpers for the "Spara som app" card (InstallAppCard.tsx).
 *
 * Everything here works on plain strings/numbers instead of touching `window`
 * or `navigator`, so the decisions can be unit-tested in the Node Vitest
 * environment (see tests/install-app.test.ts).
 */

/** Where the visitor is, from the install card's point of view. */
export type InstallPlatform = "ios" | "android" | "other";

/**
 * The non-standard `beforeinstallprompt` event. Chromium fires it before the
 * install banner and lets a page save the event and call `prompt()` later. It
 * is not part of the DOM type definitions, so it is declared here.
 */
export interface BeforeInstallPromptEventLike extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** The two signals that mean the site already runs as an installed app. */
export interface StandaloneSignals {
  /** `window.matchMedia("(display-mode: standalone)").matches`. */
  displayModeStandalone: boolean;
  /** iOS Safari's legacy `navigator.standalone === true`. */
  navigatorStandalone: boolean;
}

const IOS_RE = /iphone|ipad|ipod/i;
const MACINTOSH_RE = /macintosh/i;
const ANDROID_RE = /android/i;

/**
 * True for an iPhone/iPad/iPod, including iPadOS 13+ which reports a desktop
 * "Macintosh" user agent; the extra touch points are what give it away.
 */
export function isIosDevice(
  userAgent: string,
  maxTouchPoints: number
): boolean {
  if (IOS_RE.test(userAgent)) return true;
  return MACINTOSH_RE.test(userAgent) && maxTouchPoints > 1;
}

/**
 * Classify the visitor from `navigator.userAgent` (plus `maxTouchPoints` for
 * iPadOS). iOS and Android are the only platforms that drive different copy:
 * iOS never fires `beforeinstallprompt` (the Share sheet is the way in), while
 * Android does. Anything else – desktop Chrome/Edge included – falls back to
 * generic browser-menu instructions.
 */
export function detectPlatform(
  userAgent: string,
  maxTouchPoints = 0
): InstallPlatform {
  if (isIosDevice(userAgent, maxTouchPoints)) return "ios";
  if (ANDROID_RE.test(userAgent)) return "android";
  return "other";
}

/** True when the site is already open as a standalone / installed app. */
export function isStandalone(signals: StandaloneSignals): boolean {
  return signals.displayModeStandalone || signals.navigatorStandalone;
}

/** A single entry returned by `navigator.getInstalledRelatedApps()`. */
export interface RelatedAppLike {
  id?: string;
  platform: string;
  url?: string;
  version?: string;
}

const CHROMIUM_RE = /chrome\/|chromium\/|edg[a-z]*\//i;

/**
 * True for Chromium-based browsers that can fire `beforeinstallprompt`
 * (Chrome, Edge, Opera, Samsung Internet) – Firefox and Safari are left out.
 */
export function isChromiumBrowser(userAgent: string): boolean {
  return CHROMIUM_RE.test(userAgent);
}

/**
 * True when the browser exposes `navigator.getInstalledRelatedApps()`. The API
 * is Chromium-only; iOS Safari and Firefox do not implement it (and the TS DOM
 * lib does not declare it yet, hence the structural parameter type).
 */
export function canQueryInstalledApps(nav: {
  getInstalledRelatedApps?: unknown;
}): boolean {
  return typeof nav.getInstalledRelatedApps === "function";
}

/**
 * True when the query returned our own installed PWA. The query only ever
 * returns apps declared in the manifest's `related_applications`, so an
 * installed `webapp` entry means the site is already installed on the device.
 */
export function hasInstalledWebApp(
  apps: ReadonlyArray<Pick<RelatedAppLike, "platform">>
): boolean {
  return apps.some((app) => app.platform === "webapp");
}
