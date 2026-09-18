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

interface Props {
  onCreated: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

/** Collapsible form for creating a brand-new song. */
export default function NewSongForm({ onCreated, notify }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SongDraft>(emptySongDraft);
  const [songId, setSongId] = useState("");
  const [idEdited, setIdEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateDraft(patch: Partial<SongDraft>) {
    setDraft((previous) => {
      const next = { ...previous, ...patch };
      if (patch.title !== undefined && !idEdited) {
        setSongId(slugify(patch.title));
      }
      return next;
    });
  }

  function reset() {
    setDraft(emptySongDraft);
    setSongId("");
    setIdEdited(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!songId) {
      notify("Ange ett id (slug) för låten.", "error");
      return;
    }

    setSaving(true);
    try {
      await adminJson("/api/admin/songs", "POST", {
        id: songId,
        ...toSongPayload(draft),
      });
      notify(`Låten "${draft.title}" skapades.`, "success");
      reset();
      setOpen(false);
      await onCreated();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Kunde inte skapa låten",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className={primaryButtonClass} onClick={() => setOpen(true)}>
        + Ny låt
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Ny låt
      </h2>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Id (slug, används i filsökvägar)</span>
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

      <SongFields draft={draft} onChange={updateDraft} idPrefix="new-song" />

      <div className="mt-4 flex gap-2">
        <button type="submit" className={primaryButtonClass} disabled={saving}>
          {saving ? "Sparar…" : "Skapa låt"}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={saving}
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
