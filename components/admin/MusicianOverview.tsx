"use client";

import { useMemo, useState } from "react";
import {
  AdminApiError,
  adminJson,
  type AdminMusician,
  type AdminSong,
} from "@/data/admin";
import { buildMusicianOverview } from "./musicianOverview";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./adminStyles";

interface Feedback {
  text: string;
  tone: "success" | "error";
}

interface Props {
  songs: AdminSong[];
  musicians: AdminMusician[];
  /** Refresh just the musician list after adding one (no remount). */
  onMusiciansChanged: () => Promise<void>;
  /** Refetch songs + musicians after a rename (credit names come from songs). */
  onChanged: () => Promise<void>;
}

function recordingLabel(year: number | null, album: string | null): string {
  const parts = [year, album].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "utan år/album";
}

function describeRenameError(cause: unknown): string {
  if (cause instanceof AdminApiError && cause.code === "name_conflict") {
    return "Namnet används redan av en annan musiker.";
  }
  return cause instanceof Error ? cause.message : "Kunde inte byta namn.";
}

/**
 * Read-only overview of every registered musician and where they appear.
 * Derived entirely from the songs/musicians already loaded by the page – no
 * extra API call.
 */
export default function MusicianOverview({
  songs,
  musicians,
  onMusiciansChanged,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameFeedback, setRenameFeedback] = useState<Feedback | null>(null);
  const overview = useMemo(
    () => buildMusicianOverview(songs, musicians),
    [songs, musicians]
  );

  const withoutCredits = overview.recordingsWithoutCredits.length;

  async function handleAddMusician(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      setFeedback({ text: "Ange ett namn.", tone: "error" });
      return;
    }

    setAdding(true);
    setFeedback(null);
    try {
      const created = await adminJson<{ musician: AdminMusician }>(
        "/api/admin/musicians",
        "POST",
        { name }
      );
      setNewName("");
      setFeedback({
        text: `${created.musician.name} tillagd.`,
        tone: "success",
      });
      await onMusiciansChanged();
    } catch (cause) {
      setFeedback({
        text:
          cause instanceof Error
            ? cause.message
            : "Kunde inte lägga till musikern",
        tone: "error",
      });
    } finally {
      setAdding(false);
    }
  }

  function cancelRename() {
    setEditingId(null);
    setEditName("");
    setRenameFeedback(null);
  }

  async function handleRename(event: React.FormEvent) {
    event.preventDefault();
    if (editingId === null) return;
    const name = editName.trim();
    if (!name) {
      setRenameFeedback({ text: "Ange ett namn.", tone: "error" });
      return;
    }

    setRenaming(true);
    setRenameFeedback(null);
    try {
      await adminJson("/api/admin/musicians", "PUT", { id: editingId, name });
      setRenameFeedback({ text: "Namnet uppdaterades.", tone: "success" });
      setEditingId(null);
      setEditName("");
      // Reload songs too: credit names rendered in the cards come from the
      // songs response (join on musicians).
      await onChanged();
    } catch (cause) {
      setRenameFeedback({ text: describeRenameError(cause), tone: "error" });
    } finally {
      setRenaming(false);
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-l-4 border-zinc-200 border-l-sky-500 bg-white shadow-sm dark:border-zinc-800 dark:border-l-sky-500 dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
          open
            ? "bg-sky-50/60 dark:bg-sky-950/20"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        }`}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
              Musiker
            </span>
            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Översikt
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {overview.entries.length} registrerade · {withoutCredits}{" "}
            inspelning(ar) utan medverkande
          </span>
        </span>
        <span className="shrink-0 text-xs text-zinc-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Läsvy – uppgifterna kommer från inspelningarnas medverkande och
            ändras på inspelningskorten.
          </p>

          <form
            onSubmit={handleAddMusician}
            className="mb-4 flex flex-wrap items-end gap-2"
          >
            <label className="min-w-40 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Ny musiker
              </span>
              <input
                className={inputClass}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="t.ex. Ale Möller"
              />
            </label>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={adding}
            >
              {adding ? "Sparar…" : "Lägg till"}
            </button>
          </form>

          {feedback ? (
            <p
              role={feedback.tone === "error" ? "alert" : "status"}
              className={`mb-3 rounded-md border px-2 py-1 text-xs ${
                feedback.tone === "error"
                  ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              {feedback.text}
            </p>
          ) : null}

          {renameFeedback ? (
            <p
              role={renameFeedback.tone === "error" ? "alert" : "status"}
              className={`mb-3 rounded-md border px-2 py-1 text-xs ${
                renameFeedback.tone === "error"
                  ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              {renameFeedback.text}
            </p>
          ) : null}

          <div className="space-y-4">
            {overview.entries.map((entry) => (
              <div key={entry.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {entry.name}
                  </h3>
                  {editingId === entry.id ? null : (
                    <button
                      type="button"
                      className="text-xs text-amber-700 underline underline-offset-4 dark:text-amber-400"
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditName(entry.name);
                        setRenameFeedback(null);
                      }}
                    >
                      Byt namn
                    </button>
                  )}
                </div>

                {editingId === entry.id ? (
                  <form
                    onSubmit={handleRename}
                    className="mt-1 flex flex-wrap items-end gap-2"
                  >
                    <label className="min-w-40 flex-1">
                      <span className={labelClass}>Nytt namn</span>
                      <input
                        className={inputClass}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className={primaryButtonClass}
                      disabled={renaming}
                    >
                      {renaming ? "Sparar…" : "Spara namn"}
                    </button>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={cancelRename}
                      disabled={renaming}
                    >
                      Avbryt
                    </button>
                    <p className="w-full text-xs text-zinc-500 dark:text-zinc-400">
                      Namnet ändras på alla inspelningar.
                    </p>
                  </form>
                ) : null}
                {entry.credits.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Inga medverkande registrerade ännu.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {entry.credits.map((credit) => (
                      <li
                        key={`${credit.recordingId}-${credit.instruments.join(",")}`}
                        className="text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="font-medium">{credit.songTitle}</span>{" "}
                        <span className="text-zinc-500 dark:text-zinc-400">
                          ({recordingLabel(credit.year, credit.album)})
                        </span>{" "}
                        – {credit.instruments.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Inspelningar utan medverkande
            </h3>
            {withoutCredits === 0 ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Alla inspelningar har medverkande.
              </p>
            ) : (
              <ul className="mt-1 space-y-1">
                {overview.recordingsWithoutCredits.map((recording) => (
                  <li
                    key={recording.recordingId}
                    className="text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="font-medium">{recording.songTitle}</span>{" "}
                    <span className="text-zinc-500 dark:text-zinc-400">
                      ({recordingLabel(recording.year, recording.album)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
