/** A streaming/label link shown on /about. */
export interface SiteLink {
  label: string;
  href: string;
}

/**
 * Where to find Pärlband outside this site. Rendered as pills on /about (moved
 * there from the landing-page hero) and kept as typed data so the URLs are not
 * scattered through JSX.
 */
export const SITE_LINKS: SiteLink[] = [
  { label: "Bandcamp", href: "https://parlband.bandcamp.com/" },
  { label: "YouTube", href: "https://www.youtube.com/@P%C3%A4rlband-b2n" },
  { label: "SoundCloud", href: "https://soundcloud.com/user-212532667" },
  { label: "Facebook", href: "https://www.facebook.com/share/1FBmEozujF/" },
];

/** Public contact address, shown on /about. */
export const CONTACT_EMAIL = "parlbandet@gmail.com";
