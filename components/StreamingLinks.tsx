import { CONTACT_EMAIL, SITE_LINKS } from "@/data/siteLinks";

/** Pill styling shared by the streaming links, matching the public nav. */
const linkClass =
  "rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

/**
 * "Ni hittar oss även här" – the streaming destinations and the contact address.
 *
 * Shared by the landing-page hero (components/home/Hero.tsx) and /about
 * (components/about/AboutView.tsx) so the two never drift apart; the URLs
 * themselves live in data/siteLinks.ts.
 */
export default function StreamingLinks() {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/70 p-3 text-left shadow-sm backdrop-blur-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Ni hittar oss även här
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {SITE_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {link.label} ↗
          </a>
        ))}
      </div>

      <p className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Kontakt:{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-zinc-900 underline underline-offset-4 hover:text-black dark:text-zinc-200 dark:hover:text-white"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </section>
  );
}
