"use client";

import { useState } from "react";
import { fileUrl, uploadAdminFile } from "@/data/admin";
import { secondaryButtonClass } from "./adminStyles";

interface Props {
  songId: string;
  /** Current sheet_music_path draft value ("" when unset). */
  path: string;
  /** Called with the stored file name so the draft stays in sync. */
  onChange: (path: string) => void;
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

/**
 * Upload control for a song's sheet music / chords PDF (`songs.sheet_music_path`).
 *
 * Only rendered for songs that already exist: the PDF is named after the song id
 * and the endpoint updates the song row itself, so there is no separate "save"
 * click for the file. Mirrors the upload flow in components/admin/RecordingCard.tsx.
 */
export default function SheetMusicUpload({
  songId,
  path,
  onChange,
  onChanged,
  notify,
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const result = await uploadAdminFile("pdf", songId, null, file);
      onChange(result.path);
      notify("Noter uppladdade och sparade.", "success");
      await onChanged();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Uppladdningen misslyckades",
        "error"
      );
    } finally {
      setUploading(false);
    }
  }

  const url = fileUrl("pdf", path);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className={`${secondaryButtonClass} cursor-pointer`}>
        {uploading ? "Laddar upp…" : "Ladda upp noter (PDF)"}
        <input
          type="file"
          className="hidden"
          accept="application/pdf,.pdf"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleUpload(file);
          }}
        />
      </label>

      {url ? (
        <a
          className="text-xs text-amber-700 underline underline-offset-4 dark:text-amber-400"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Öppna noter ↗
        </a>
      ) : null}
    </div>
  );
}
