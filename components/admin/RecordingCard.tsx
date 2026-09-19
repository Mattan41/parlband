"use client";

import { useState } from "react";
import {
  adminJson,
  fileUrl,
  uploadAdminFile,
  type AdminMusician,
  type AdminRecording,
  type AdminSong,
  type AdminUploadKind,
} from "@/data/admin";
import CreditsEditor from "./CreditsEditor";
import {
  dangerButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./adminStyles";

/** Editable recording fields; numbers are kept as strings for the inputs. */
interface RecordingDraft {
  album: string;
  studio: string;
  year: string;
  engineer: string;
  notes: string;
  mp3_path: string;
  wav_path: string;
  cover_path: string;
  is_primary: boolean;
  is_public: boolean;
}

/** Upload kinds attached to a recording; a PDF belongs to the song instead. */
type RecordingUploadKind = Exclude<AdminUploadKind, "pdf">;

const PATH_FIELD: Record<RecordingUploadKind, keyof RecordingDraft> = {
  mp3: "mp3_path",
  wav: "wav_path",
  cover: "cover_path",
};

const UPLOAD_LABEL: Record<RecordingUploadKind, string> = {
  mp3: "MP3",
  wav: "WAV",
  cover: "omslag",
};

const UPLOAD_ACCEPT: Record<RecordingUploadKind, string> = {
  mp3: "audio/mpeg,audio/mp3,.mp3",
  wav: "audio/wav,audio/x-wav,.wav",
  cover: "image/*",
};

const UPLOAD_KINDS: RecordingUploadKind[] = ["mp3", "wav", "cover"];

function toDraft(
  recording: AdminRecording | null,
  songId: string
): RecordingDraft {
  return {
    album: recording?.album ?? "",
    studio: recording?.studio ?? "",
    year: recording?.year != null ? String(recording.year) : "",
    engineer: recording?.engineer ?? "",
    notes: recording?.notes ?? "",
    mp3_path: recording?.mp3_path ?? `${songId}.mp3`,
    wav_path: recording?.wav_path ?? "",
    cover_path: recording?.cover_path ?? "",
    is_primary: recording ? recording.is_primary === 1 : false,
    // New recordings are visible on the site until the band hides them.
    is_public: recording ? recording.is_public === 1 : true,
  };
}

interface Props {
  song: AdminSong;
  /** null creates a new recording under `song`. */
  recording: AdminRecording | null;
  musicians: AdminMusician[];
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
  onCancel?: () => void;
}

export default function RecordingCard({
  song,
  recording,
  musicians,
  onChanged,
  notify,
  onCancel,
}: Props) {
  // Seeded once. The parent section remounts after every reload (the
  // version-based key in app/admin/page.tsx), so the draft picks up fresh
  // server data without a prop-to-state syncing effect.
  const [draft, setDraft] = useState<RecordingDraft>(() =>
    toDraft(recording, song.id)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<AdminUploadKind | null>(null);

  const isNew = recording === null;

  function updateDraft(patch: Partial<RecordingDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
  }

  /** Validate and build the POST/PUT body, or null when invalid. */
  function buildPayload(): Record<string, unknown> | null {
    const trimmedMp3 = draft.mp3_path.trim();
    if (!trimmedMp3) {
      notify("mp3_path krävs (fylls i automatiskt av uppladdning).", "error");
      return null;
    }

    const trimmedYear = draft.year.trim();
    if (trimmedYear !== "" && !/^\d{1,4}$/.test(trimmedYear)) {
      notify("År måste vara ett fyrsiffrigt heltal.", "error");
      return null;
    }

    return {
      ...(recording ? { id: recording.id } : { song_id: song.id }),
      album: draft.album,
      studio: draft.studio,
      year: trimmedYear === "" ? null : Number(trimmedYear),
      engineer: draft.engineer,
      notes: draft.notes,
      mp3_path: trimmedMp3,
      wav_path: draft.wav_path,
      cover_path: draft.cover_path,
      is_primary: draft.is_primary,
      is_public: draft.is_public,
    };
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      await adminJson("/api/admin/recordings", isNew ? "POST" : "PUT", payload);
      notify(
        isNew ? "Inspelningen skapades." : "Inspelningen sparades.",
        "success"
      );
      if (isNew) onCancel?.();
      await onChanged();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Kunde inte spara inspelningen",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!recording) return;
    const confirmed = window.confirm(
      `Ta bort inspelning #${recording.id}? R2-filerna lämnas kvar i bucketen.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await adminJson(`/api/admin/recordings?id=${recording.id}`, "DELETE");
      notify("Inspelningen togs bort.", "success");
      await onChanged();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Kunde inte ta bort inspelningen",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(kind: RecordingUploadKind, file: File) {
    setUploading(kind);
    try {
      const result = await uploadAdminFile(
        kind,
        song.id,
        recording?.id ?? null,
        file
      );
      const field = PATH_FIELD[kind];
      updateDraft({ [field]: result.path } as Partial<RecordingDraft>);
      if (recording) {
        notify(`${UPLOAD_LABEL[kind]} uppladdad och sparad.`, "success");
        await onChanged();
      } else {
        notify(
          `${UPLOAD_LABEL[kind]} uppladdad – spara inspelningen för att koppla filen.`,
          "success"
        );
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Uppladdningen misslyckades",
        "error"
      );
    } finally {
      setUploading(null);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          {isNew ? "Ny inspelning" : `Inspelning #${recording.id}`}
          {!isNew && recording.is_primary === 1 ? " · huvudinspelning" : ""}
          {!isNew && recording.is_public === 0 ? " · dold" : ""}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {recording?.play_count ?? 0} spelningar (räknas automatiskt)
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Album</span>
          <input
            className={inputClass}
            value={draft.album}
            onChange={(event) => updateDraft({ album: event.target.value })}
          />
        </label>
        <label>
          <span className={labelClass}>Studio</span>
          <input
            className={inputClass}
            value={draft.studio}
            onChange={(event) => updateDraft({ studio: event.target.value })}
          />
        </label>
        <label>
          <span className={labelClass}>År</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={draft.year}
            onChange={(event) => updateDraft({ year: event.target.value })}
          />
        </label>
        <label>
          <span className={labelClass}>Tekniker</span>
          <input
            className={inputClass}
            value={draft.engineer}
            onChange={(event) => updateDraft({ engineer: event.target.value })}
          />
        </label>
        <label>
          <span className={labelClass}>MP3-sökväg</span>
          <input
            className={inputClass}
            value={draft.mp3_path}
            onChange={(event) => updateDraft({ mp3_path: event.target.value })}
          />
        </label>
        <label>
          <span className={labelClass}>WAV-sökväg</span>
          <input
            className={inputClass}
            value={draft.wav_path}
            onChange={(event) => updateDraft({ wav_path: event.target.value })}
          />
        </label>
        <label>
          <span className={labelClass}>Omslagsbild</span>
          <input
            className={inputClass}
            value={draft.cover_path}
            onChange={(event) =>
              updateDraft({ cover_path: event.target.value })
            }
          />
        </label>
        <label>
          <span className={labelClass}>Anteckningar</span>
          <input
            className={inputClass}
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
          />
        </label>
      </div>

      <fieldset className="mt-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className={labelClass}>Synlighet</legend>

        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            checked={draft.is_public}
            onChange={(event) =>
              updateDraft({ is_public: event.target.checked })
            }
          />
          <span>
            Publik (visas på hemsidan)
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Avmarkera för att dölja inspelningen på hemsidan. Inspelningen kan fortfarande spelas upp via direktlänk.
            </span>
          </span>
        </label>

        <label className="mt-3 flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            checked={draft.is_primary}
            onChange={(event) =>
              updateDraft({ is_primary: event.target.checked })
            }
          />
          <span>
            Huvudinspelning
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Avgör vilken av de publika inspelningarna som spelas när flera
              finns. Döljer ingenting i sig.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {UPLOAD_KINDS.map((kind) => (
          <label
            key={kind}
            className={`${secondaryButtonClass} cursor-pointer`}
          >
            {uploading === kind
              ? "Laddar upp…"
              : `Ladda upp ${UPLOAD_LABEL[kind]}`}
            <input
              type="file"
              className="hidden"
              accept={UPLOAD_ACCEPT[kind]}
              disabled={uploading !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleUpload(kind, file);
              }}
            />
          </label>
        ))}

        {fileUrl("mp3", draft.mp3_path) ? (
          <a
            className="text-xs text-amber-700 underline underline-offset-4 dark:text-amber-400"
            href={fileUrl("mp3", draft.mp3_path)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Öppna MP3 ↗
          </a>
        ) : null}
        {fileUrl("cover", draft.cover_path) ? (
          <a
            className="text-xs text-amber-700 underline underline-offset-4 dark:text-amber-400"
            href={fileUrl("cover", draft.cover_path)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Öppna omslag ↗
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" className={primaryButtonClass} disabled={saving}>
          {saving ? "Sparar…" : isNew ? "Skapa inspelning" : "Spara"}
        </button>
        {onCancel ? (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={onCancel}
            disabled={saving}
          >
            Avbryt
          </button>
        ) : null}
        {!isNew ? (
          <button
            type="button"
            className={dangerButtonClass}
            onClick={() => void handleDelete()}
            disabled={saving}
          >
            Ta bort
          </button>
        ) : null}
      </div>

      <CreditsEditor
        recordingId={recording?.id ?? null}
        credits={recording?.credits ?? []}
        musicians={musicians}
        onChanged={onChanged}
        notify={notify}
      />
    </form>
  );
}
