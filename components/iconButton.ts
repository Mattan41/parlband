/**
 * Shared styles for the round icon controls used by the song list
 * (components/SongRow.tsx) and the sticky player (components/StickyPlayer.tsx),
 * so their hover/focus affordances stay in sync.
 *
 * Hover: subtle grow plus the existing background lightening.
 * Press: slight shrink. Keyboard: amber ring matching the active-row accent.
 */
export const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 transition hover:scale-105 hover:bg-zinc-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:focus-visible:ring-offset-zinc-900";

/** Extra styles for buttons that can be disabled (e.g. skip-next with an empty queue). */
export const iconButtonDisabledClass =
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-zinc-200 dark:disabled:hover:bg-zinc-700";
