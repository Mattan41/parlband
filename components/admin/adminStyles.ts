/**
 * Shared styles for the admin surface (app/admin/page.tsx and
 * components/admin/*). Reuses the site's zinc/amber theme and dark mode, but
 * with a denser, form-oriented look than the public landing page.
 */
export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export const labelClass =
  "block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus-visible:ring-offset-zinc-950";

/** Small table used for recordings and credits. */
export const tableClass =
  "w-full border-collapse text-left text-sm text-zinc-800 dark:text-zinc-200";

export const tableHeaderClass =
  "border-b border-zinc-200 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400";
