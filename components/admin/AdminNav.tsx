"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Admin-area destinations. */
const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Katalog" },
  { href: "/admin/gigs", label: "Spelningar" },
  { href: "/admin/about", label: "Om oss" },
] as const;

/**
 * Navigation between the admin surfaces, rendered on every /admin page.
 * Deliberately separate from the public components/SiteNav.tsx: the admin pages
 * live outside the public shell and get their own chrome. Same pill look as the
 * public nav, with the amber accent marking the active page.
 */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Adminmeny" className="flex items-center gap-2">
      {ADMIN_NAV_LINKS.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              active
                ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500/70 dark:bg-amber-500/10 dark:text-amber-200"
                : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
