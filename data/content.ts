/**
 * Editable page copy returned by GET /api/content and saved through
 * PUT /api/admin/content.
 */
export interface SiteContent {
  /** Welcome line under the band members on the landing page. */
  welcomeText: string;
  /** Heading of the /about page. */
  aboutHeading: string;
  /** Free text body of the /about page. */
  aboutBody: string;
}

/** Heading shown when `aboutHeading` has been emptied in the admin. */
export const DEFAULT_ABOUT_HEADING = "Om oss";

/** Load the editable page copy. Shared by the pages and the admin editor. */
export function fetchSiteContent(): Promise<SiteContent> {
  return fetch("/api/content").then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load site content: ${response.status}`);
    }
    return response.json() as Promise<SiteContent>;
  });
}
