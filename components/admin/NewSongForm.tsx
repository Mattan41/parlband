"use client";

import { useState } from "react";
import { adminJson, slugify } from "@/data/admin";
import SongFields, {
  emptySongDraft,
  toSongPayload,
  type SongDraft,
} from "./SongFields";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./adminStyles";
import AdminModal from "./AdminModal";
import { blockEnterSubmit } from "./adminForms";

interface Props {
  /** Called with the new song id after a successful create so the parent can expand it. */
  onCreated: (songId: string) => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

function draftEquals(a: SongDraft, b: SongDraft): boolean {
  return (
    a.title === b.title &&
    a.artist === b.artist &&
    a.lyrics_by === b.lyrics_by &&
    a.music_by === b.music_by &&
    a.lyrics === b.lyrics &&
    a.sheet_music_path === b.sheet_music_path
  );
}

/** Trigger button + modal for creating a brand-new song. */
export default function NewSongForm({ onCreated, notify }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SongDraft>(emptySongDraft);
  const [songId, setSongId] = useState("");
  const [idEdited, setIdEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = songId !== "" || !draftEquals(draft, emptySongDraft);

  function updateDraft(patch: Partial<SongDraft>) {
    if (patch.title !== undefined && !idEdited) {
      setSongId(slugify(patch.title));
    }
    setDraft((previous) => ({ ...previous, ...patch }));
  }

  function reset() {
    setDraft(emptySongDraft);
    setSongId("");
    setIdEdited(false);
    setError(null);
  }

  function openModal() {
    reset();
    setOpen(true);
  }

  /** Closing always goes through here, so unsaved input is never dropped silently. */
  function closeModal() {
    if (saving) return;
    if (isDirty && !window.confirm("Du har osparade ändringar. Stäng ändå?")) {
      return;
    }
    reset();
    setOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!songId) {
      setError("Ange ett id (slug) för låten.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await adminJson("/api/admin/songs", "POST", {
        id: songId,
        ...toSongPayload(draft),
      });
      notify(`Låten "${draft.title}" skapades.`, "success");
      const createdId = songId;
      reset();
      setOpen(false);
      await onCreated(createdId);
    } catch (cause) {
      // The modal stays open with the entered data so it can be corrected.
      setError(
        cause instanceof Error ? cause.message : "Kunde inte skapa låten"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" className={primaryButtonClass} onClick={openModal}>
        + Ny låt
      </button>

      <AdminModal
        open={open}
        title="Ny låt"
        help="Skapa en ny låt i katalogen. Fyll i titel, upphovspersoner och text – id:t (slug) föreslås från titeln och används i filnamn. Efter att låten sparats öppnas den så att du kan lägga upp noter (PDF), lägga till inspelningar och markera om den ska vara publicerad."
        busy={saving}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} onKeyDown={blockEnterSubmit}>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className={labelClass}>
                Id (slug, används i filsökvägar)
              </span>
              <input
                className={inputClass}
                value={songId}
                onChange={(event) => {
                  setIdEdited(true);
                  setSongId(event.target.value);
                }}
                placeholder="t.ex. ny-lat"
              />
            </label>
            <p className="self-end text-xs text-zinc-500 dark:text-zinc-400">
              Föreslås från titeln. Får bara innehålla a-z, 0-9 och bindestreck.
            </p>
          </div>

          <SongFields
            draft={draft}
            onChange={updateDraft}
            idPrefix="new-song"
            showVisibility={false}
          />

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={saving}
            >
              {saving ? "Sparar…" : "Skapa låt"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={closeModal}
              disabled={saving}
            >
              Avbryt
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
