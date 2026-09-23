"use client";

import { useEffect, useState } from "react";
import {
  AdminApiError,
  adminJson,
  fileUrl,
  uploadAdminFile,
  type AdminCredit,
  type AdminMusician,
  type AdminRecording,
  type AdminSong,
  type AdminUploadKind,
} from "@/data/admin";
import CreditsEditor from "./CreditsEditor";
import { blockEnterSubmit } from "./adminForms";
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

function toDraft(recording: AdminRecording | null): RecordingDraft {
  return {
    album: recording?.album ?? "",
    studio: recording?.studio ?? "",
    year: recording?.year != null ? String(recording.year) : "",
    engineer: recording?.engineer ?? "",
    notes: recording?.notes ?? "",
    // New recordings start empty; the path is filled in by uploading the file.
    mp3_path: recording?.mp3_path ?? "",
    wav_path: recording?.wav_path ?? "",
    cover_path: recording?.cover_path ?? "",
    is_primary: recording ? recording.is_primary === 1 : false,
    // New recordings are visible on the site until the band hides them.
    is_public: recording ? recording.is_public === 1 : true,
  };
}

function draftEquals(a: RecordingDraft, b: RecordingDraft): boolean {
  return (
    a.album === b.album &&
    a.studio === b.studio &&
    a.year === b.year &&
    a.engineer === b.engineer &&
    a.notes === b.notes &&
    a.mp3_path === b.mp3_path &&
    a.wav_path === b.wav_path &&
    a.cover_path === b.cover_path &&
    a.is_primary === b.is_primary &&
    a.is_public === b.is_public
  );
}

interface Feedback {
  text: string;
  tone: "success" | "error";
}

/** Swedish message for a failed save, including the server error codes. */
function describeSaveError(cause: unknown): string {
  if (cause instanceof AdminApiError) {
    if (cause.code === "mp3_missing")
      return "MP3-filen finns inte i R2 – ladda upp filen först.";
    if (cause.code === "mp3_invalid")
      return "Ogiltig MP3-sökväg – ange ett filnamn som slutar på .mp3.";
  }
  return cause instanceof Error
    ? cause.message
    : "Kunde inte spara inspelningen";
}

/** "Mats: Elbas · Nova: Sång" – compact credits line for the collapsed header. */
function formatCredits(credits: AdminCredit[]): string {
  const instrumentsByMusician = new Map<string, string[]>();
  for (const credit of credits) {
    const instruments = instrumentsByMusician.get(credit.musician) ?? [];
    instruments.push(credit.instrument);
    instrumentsByMusician.set(credit.musician, instruments);
  }
  return [...instrumentsByMusician.entries()]
    .map(([name, instruments]) => `${name}: ${instruments.join(", ")}`)
    .join(" · ");
}

interface Props {
  song: AdminSong;
  /** null creates a new recording under `song`. */
  recording: AdminRecording | null;
  musicians: AdminMusician[];
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
  onCancel?: () => void;
  /** Called with the new recording's id after a successful create. */
  onCreated?: (recordingId: number) => void;
  /** Reports whether the card is saving or uploading (used by the modal shell). */
  onBusyChange?: (busy: boolean) => void;
  /** Reports whether the card has unsaved edits (used by the modal shell). */
  onDirtyChange?: (dirty: boolean) => void;
  onMusiciansChanged?: () => Promise<void>;
  /** Whether the body is shown. Defaults to true (e.g. inside the modal). */
  expanded?: boolean;
  onToggle?: () => void;
}

export default function RecordingCard({
  song,
  recording,
  musicians,
  onChanged,
  notify,
  onCancel,
  onCreated,
  onBusyChange,
  onDirtyChange,
  onMusiciansChanged,
  expanded = true,
  onToggle,
}: Props) {
  // Seeded once. Reloads no longer remount the card (see app/admin/page.tsx),
  // so drafts stay put until they are saved or the page is left.
  const [draft, setDraft] = useState<RecordingDraft>(() => toDraft(recording));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<AdminUploadKind | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const isNew = recording === null;
  const isBusy = saving || uploading !== null;

  // Reflect a server-side primary change (setting one recording primary clears
  // the flag on the song's siblings) without remounting. This is React's
  // "adjust state while rendering" pattern: compare the incoming prop with the
  // previous value and only adopt it when the user has not changed it locally.
  const serverPrimary = recording ? recording.is_primary : 0;
  const [previousServerPrimary, setPreviousServerPrimary] =
    useState(serverPrimary);
  if (serverPrimary !== previousServerPrimary) {
    setPreviousServerPrimary(serverPrimary);
    if ((draft.is_primary ? 1 : 0) === previousServerPrimary) {
      setDraft((previous) => ({
        ...previous,
        is_primary: serverPrimary === 1,
      }));
    }
  }

  const isDirty =
    (isNew && hasUploaded) || !draftEquals(draft, toDraft(recording));

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function updateDraft(patch: Partial<RecordingDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
  }

  /** Validate and build the POST/PUT body, or null when invalid. */
  function buildPayload(): Record<string, unknown> | null {
    const trimmedMp3 = draft.mp3_path.trim();
    if (!trimmedMp3) {
      setFeedback({
        text: "Ladda upp en MP3 (eller ange en sökväg) – mp3_path krävs.",
        tone: "error",
      });
      return null;
    }

    const trimmedYear = draft.year.trim();
    if (trimmedYear !== "" && !/^\d{1,4}$/.test(trimmedYear)) {
      setFeedback({
        text: "År måste vara ett fyrsiffrigt heltal.",
        tone: "error",
      });
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
    setFeedback(null);
    try {
      const result = await adminJson<{ recording: AdminRecording }>(
        "/api/admin/recordings",
        isNew ? "POST" : "PUT",
        payload
      );
      if (isNew) {
        notify("Inspelningen skapades.", "success");
        await onChanged();
        onCreated?.(result.recording.id);
      } else {
        setFeedback({ text: "Inspelningen sparades.", tone: "success" });
        await onChanged();
      }
    } catch (cause) {
      setFeedback({ text: describeSaveError(cause), tone: "error" });
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
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Kunde inte ta bort inspelningen",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(kind: RecordingUploadKind, file: File) {
    setUploading(kind);
    setFeedback(null);
    try {
      const result = await uploadAdminFile(
        kind,
        song.id,
        recording?.id ?? null,
        file
      );
      const field = PATH_FIELD[kind];
      updateDraft({ [field]: result.path } as Partial<RecordingDraft>);
      setHasUploaded(true);
      if (recording) {
        setFeedback({
          text: `${UPLOAD_LABEL[kind]} uppladdad och sparad.`,
          tone: "success",
        });
        await onChanged();
      } else {
        setFeedback({
          text: `${UPLOAD_LABEL[kind]} uppladdad – spara inspelningen för att koppla filen.`,
          tone: "success",
        });
      }
    } catch (cause) {
      setFeedback({
        text:
          cause instanceof Error ? cause.message : "Uppladdningen misslyckades",
        tone: "error",
      });
    } finally {
      setUploading(null);
    }
  }

  const primaryBadge =
    !isNew && recording.is_primary === 1 ? (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        Huvudinspelning
      </span>
    ) : null;

  const hiddenBadge =
    !isNew && recording.is_public === 0 ? (
      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
        Dold
      </span>
    ) : null;

  const summary = isNew
    ? "Fyll i uppgifterna nedan."
    : [recording.year, recording.album].filter(Boolean).join(" · ") ||
      "Inget år/album angivet";

  const creditSummary = recording ? formatCredits(recording.credits) : "";

  const headerInner = (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
          {isNew ? "Ny inspelning" : "Inspelning"}
        </span>
        {primaryBadge}
        {hiddenBadge}
        <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
          {summary}
        </span>
      </span>
      {creditSummary ? (
        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {creditSummary}
        </span>
      ) : null}
    </span>
  );

  const headerRow = (
    <>
      {headerInner}
      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
        {recording?.download_count ?? 0} nedladdningar ·{" "}
        {recording?.play_count ?? 0} spelningar
      </span>
      {onToggle ? (
        <span className="shrink-0 text-xs text-zinc-400">
          {expanded ? "▲" : "▼"}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-l-4 border-zinc-200 border-l-sky-500 bg-sky-50/40 transition focus-within:ring-1 focus-within:ring-sky-400 dark:border-zinc-800 dark:border-l-sky-500 dark:bg-sky-950/20 dark:focus-within:ring-sky-600">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={`flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-sky-100/50 dark:hover:bg-sky-900/40 ${
            expanded
              ? "border-b border-zinc-200 bg-sky-100/30 dark:border-zinc-800 dark:bg-sky-900/30"
              : ""
          }`}
        >
          {headerRow}
        </button>
      ) : (
        <div className="flex w-full items-center justify-between gap-2 p-3">
          {headerRow}
        </div>
      )}

      {/* Mounted even when collapsed so unsaved drafts survive. */}
      <div hidden={!expanded} className="p-3">
        {/* Only the recording fields/actions: the credits editor below is its
            own form and must NOT be nested (nested forms break submission). */}
        <form onSubmit={handleSave} onKeyDown={blockEnterSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                onChange={(event) =>
                  updateDraft({ studio: event.target.value })
                }
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
                onChange={(event) =>
                  updateDraft({ engineer: event.target.value })
                }
              />
            </label>
            <label>
              <span className={labelClass}>MP3-sökväg</span>
              <input
                className={inputClass}
                value={draft.mp3_path}
                onChange={(event) =>
                  updateDraft({ mp3_path: event.target.value })
                }
              />
              <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                Fylls i när du laddar upp. Filen måste finnas i R2.
              </span>
            </label>
            <label>
              <span className={labelClass}>WAV-sökväg</span>
              <input
                className={inputClass}
                value={draft.wav_path}
                onChange={(event) =>
                  updateDraft({ wav_path: event.target.value })
                }
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
                  Avmarkera för att dölja inspelningen på hemsidan. Inspelningen
                  kan fortfarande spelas upp via direktlänk.
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

          {/* Feedback sits next to the actions instead of at the top of the card:
              the upload buttons and Spara/Ta bort are what produce it, and on a
              phone a message at the top of a tall card is scrolled out of view. */}
          {feedback ? (
            <p
              role={feedback.tone === "error" ? "alert" : "status"}
              className={`mt-3 rounded-md border px-3 py-2 text-xs ${
                feedback.tone === "error"
                  ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              {feedback.text}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={isBusy}
            >
              {saving ? "Sparar…" : isNew ? "Skapa inspelning" : "Spara"}
            </button>
            {onCancel ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={onCancel}
                disabled={isBusy}
              >
                Avbryt
              </button>
            ) : null}
            {!isNew ? (
              <button
                type="button"
                className={dangerButtonClass}
                onClick={() => void handleDelete()}
                disabled={isBusy}
              >
                Ta bort
              </button>
            ) : null}
          </div>
        </form>

        <CreditsEditor
          recordingId={recording?.id ?? null}
          credits={recording?.credits ?? []}
          musicians={musicians}
          onChanged={onChanged}
          onMusiciansChanged={onMusiciansChanged}
        />
      </div>
    </div>
  );
}
