"use client";

import { useMemo, useState } from "react";
import { AdminApiError, adminJson, type AdminSong } from "@/data/admin";
import {
  moveInPlaylist,
  samePlaylistOrder,
  toPlaylistOrder,
} from "./playlistOrder";
import {
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./adminStyles";

interface Props {
  /** Every song (GET /api/admin/songs), with its current `sort_order`. */
  songs: AdminSong[];
  /** Silent refresh after a successful save. */
  onSaved: () => Promise<void> | void;
  notify: (text: string, tone: "success" | "error") => void;
}

interface Feedback {
  text: string;
  tone: "success" | "error";
}

/**
 * Swedish copy for the validation codes from
 * functions/api/admin/playlist-rules.ts.
 *
 * The API messages are English (they are API errors); the codes are the stable
 * contract, so the user-facing text lives here – the same split as
 * `mp3_missing` in the recording editor and the gig codes in GigsSection.
 */
const PLAYLIST_ERROR_MESSAGES: Record<string, string> = {
  order_invalid: "Ogiltig ordning – ladda om sidan och försök igen.",
  order_duplicate: "Samma låt förekommer två gånger i listan.",
  playlist_mismatch:
    "Listan stämmer inte med låtarna i databasen – tryck Återställ och försök igen.",
};

/**
 * Editor for the public playlist order (the landing page's song list).
 *
 * The order comes straight from `songs.sort_order`; a local draft only exists
 * while it differs from the server (null = "no local changes, follow the
 * server"), so a reload elsewhere is picked up for free and the save button
 * turns off again after a successful write.
 *
 * Reordering is done with up/down buttons rather than drag-and-drop: no extra
 * dependency, keyboard- and screen-reader-friendly, and reliable on a phone.
 * Saving PUTs the complete ordered list to /api/admin/playlist, which renumbers
 * `sort_order` to 1..N in one transaction.
 */
export default function PlaylistOrder({
  songs,
  onSaved,
  notify,
}: Readonly<Props>) {
  const serverOrder = useMemo(() => toPlaylistOrder(songs), [songs]);
  const songsById = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs]
  );

  /** null while the draft matches the server order. */
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const order = draft ?? serverOrder;
  const isDirty = draft !== null && !samePlaylistOrder(draft, serverOrder);

  function move(index: number, direction: -1 | 1) {
    setDraft(moveInPlaylist(order, index, direction));
    setFeedback(null);
  }

  function reset() {
    setDraft(null);
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await adminJson("/api/admin/playlist", "PUT", { order });
      // Reload first, then drop the draft: the server order is the saved order
      // by then, so the list never flashes back to the old order (and the save
      // button disables again).
      await onSaved();
      setDraft(null);
      notify("Ordningen sparades.", "success");
    } catch (cause) {
      const code = cause instanceof AdminApiError ? cause.code : null;
      const text =
        (code ? PLAYLIST_ERROR_MESSAGES[code] : undefined) ??
        (cause instanceof Error ? cause.message : "Kunde inte spara ordningen");
      setFeedback({ text, tone: "error" });
      notify(text, "error");
    } finally {
      setSaving(false);
    }
  }

  if (songs.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Inga låtar ännu. Skapa dem under Katalog.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Spellista
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ordningen på startsidans låtlista – och den ordning spelaren följer
          när kön tar slut. Texterna under <strong>Texter</strong> listas alltid
          i bokstavsordning och påverkas inte.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <ol className="space-y-2">
          {order.map((id, index) => {
            const song = songsById.get(id);
            const title = song?.title ?? id;
            const isFirst = index === 0;
            const isLast = index === order.length - 1;

            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-500">
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {title}
                  </span>
                  {song?.is_published === 0 ? (
                    <span className="mt-0.5 inline-block rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                      Utkast
                    </span>
                  ) : null}
                </span>

                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Flytta ${title} uppåt`}
                    onClick={() => move(index, -1)}
                    disabled={isFirst}
                    className={`${secondaryButtonClass} px-2 py-1`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Flytta ${title} nedåt`}
                    onClick={() => move(index, 1)}
                    disabled={isLast}
                    className={`${secondaryButtonClass} px-2 py-1`}
                  >
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ol>

        {feedback ? (
          <p
            role="alert"
            className={`mt-3 rounded-md border px-3 py-2 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={saving || !isDirty}
          >
            {saving ? "Sparar…" : "Spara ordning"}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={reset}
            disabled={saving || !isDirty}
          >
            Återställ
          </button>
          <span className={`${labelClass} font-normal normal-case`}>
            {isDirty ? "Osparade ändringar" : "Sparad"}
          </span>
        </div>
      </form>
    </section>
  );
}
