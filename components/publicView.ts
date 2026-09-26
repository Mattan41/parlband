/**
 * Which of the three public views the single `/` route is currently showing.
 *
 * The views used to be three separate routes; they are now switched inside one
 * page (a pure SPA) so that moving between them never triggers a route change
 * and the app-wide sticky player keeps its state. The choice is still kept in
 * the URL (`?view=`, or `?song=` for a specific lyric) so links stay shareable
 * and reloads restore the same view.
 */
export type PublicView = "lyssna" | "texter" | "about";

/**
 * Derive the active view from a query string.
 *
 * `?song=<id>` always wins and opens the lyrics view with that song selected:
 * old `/texter?song=<id>` links are redirected to `/?song=<id>` and must keep
 * working even if a `view` param happens to tag along. Otherwise an explicit
 * `?view=texter` or `?view=about` is honoured, and anything else (including no
 * query string at all) is the landing view.
 *
 * The parameter is typed structurally as `Pick<URLSearchParams, "get">` so the
 * read-only params object returned by `useSearchParams` can be passed straight
 * in.
 */
export function readPublicView(
  searchParams: Pick<URLSearchParams, "get">
): PublicView {
  if (searchParams.get("song")) return "texter";

  const view = searchParams.get("view");
  return view === "texter" || view === "about" ? view : "lyssna";
}
