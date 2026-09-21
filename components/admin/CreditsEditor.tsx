"use client";

import { useId, useState } from "react";
import {
  AdminApiError,
  adminJson,
  type AdminCredit,
  type AdminMusician,
} from "@/data/admin";
import {
  dangerButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  tableClass,
} from "./adminStyles";

/** Common instruments offered as autocomplete suggestions. */
const INSTRUMENT_SUGGESTIONS = [
  "Sång",
  "Kör",
  "Akustisk gitarr",
  "Elgitarr",
  "Akustisk bas",
  "Elbas",
  "Piano",
  "Fiol",
  "Dragspel",
  "Mandolin",
  "Irländsk bouzouki",
];

/** Sentinel value for the "create a new musician" option. */
const NEW_MUSICIAN = "__new__";

interface Feedback {
  text: string;
  tone: "success" | "error";
}

/** Map server/network failures to Swedish messages the band understands. */
function describeError(cause: unknown, fallback: string): string {
  if (cause instanceof AdminApiError) {
    if (cause.status === 409) return "Medverkande finns redan på inspelningen.";
    if (cause.status === 404)
      return "Inspelningen eller musikern finns inte längre – ladda om sidan.";
  }
  return cause instanceof Error ? cause.message : fallback;
}

interface Props {
  recordingId: number | null;
  credits: AdminCredit[];
  musicians: AdminMusician[];
  onChanged: () => Promise<void>;
  onMusiciansChanged?: () => Promise<void>;
}

export default function CreditsEditor({
  recordingId,
  credits,
  musicians,
  onChanged,
  onMusiciansChanged,
}: Props) {
  const [musicianId, setMusicianId] = useState<string>("");
  const [newMusicianName, setNewMusicianName] = useState("");
  const [instrument, setInstrument] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Unique per editor instance: several recording cards may be mounted at once.
  const instrumentListId = useId();

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (recordingId === null) return;

    const trimmedInstrument = instrument.trim();
    if (!trimmedInstrument) {
      setFeedback({ text: "Ange ett instrument.", tone: "error" });
      return;
    }
    if (musicianId === "") {
      setFeedback({ text: "Välj en musiker.", tone: "error" });
      return;
    }
    if (musicianId === NEW_MUSICIAN && !newMusicianName.trim()) {
      setFeedback({ text: "Ange namnet på den nya musikern.", tone: "error" });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      let resolvedMusicianId: number;
      if (musicianId === NEW_MUSICIAN) {
        const name = newMusicianName.trim();
        const created = await adminJson<{ musician: AdminMusician }>(
          "/api/admin/musicians",
          "POST",
          { name }
        );
        resolvedMusicianId = created.musician.id;
        // Show the (possibly already existing) musician in the dropdown and
        // refresh the list, so a later failure cannot leave it stale.
        setMusicianId(String(resolvedMusicianId));
        setNewMusicianName("");
        await onMusiciansChanged?.();
      } else {
        resolvedMusicianId = Number(musicianId);
      }

      await adminJson("/api/admin/credits", "POST", {
        recording_id: recordingId,
        musician_id: resolvedMusicianId,
        instrument: trimmedInstrument,
      });
      setFeedback({ text: "Medverkande tillagd.", tone: "success" });
      setInstrument("");
      setMusicianId("");
      await onChanged();
    } catch (cause) {
      setFeedback({
        text: describeError(cause, "Kunde inte lägga till medverkande."),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(credit: AdminCredit) {
    if (recordingId === null) return;
    const params = new URLSearchParams({
      recording_id: String(recordingId),
      musician_id: String(credit.musician_id),
      instrument: credit.instrument,
    });

    try {
      setBusy(true);
      setFeedback(null);
      await adminJson(`/api/admin/credits?${params.toString()}`, "DELETE");
      setFeedback({ text: "Medverkande borttaget.", tone: "success" });
      await onChanged();
    } catch (cause) {
      setFeedback({
        text: describeError(cause, "Kunde inte ta bort medverkande."),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <h4 className={labelClass}>Medverkande</h4>

      {recordingId === null ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Spara inspelningen först – därefter går det att lägga till
          medverkande.
        </p>
      ) : (
        <>
          {feedback ? (
            <p
              role={feedback.tone === "error" ? "alert" : "status"}
              className={`mt-1 rounded-md border px-2 py-1 text-xs ${
                feedback.tone === "error"
                  ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              {feedback.text}
            </p>
          ) : null}

          {credits.length === 0 ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Inga medverkande registrerade.
            </p>
          ) : (
            <table className={`${tableClass} mt-1`}>
              <tbody>
                {credits.map((credit) => (
                  <tr
                    key={`${credit.musician_id}-${credit.instrument}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="py-1 pr-4">{credit.musician}</td>
                    <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-400">
                      {credit.instrument}
                    </td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        className={dangerButtonClass}
                        disabled={busy}
                        onClick={() => void handleRemove(credit)}
                      >
                        Ta bort
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form
            onSubmit={handleAdd}
            className="mt-2 flex flex-wrap items-end gap-2"
          >
            <label className="min-w-40 flex-1">
              <span className={labelClass}>Musiker</span>
              <select
                className={inputClass}
                value={musicianId}
                onChange={(event) => setMusicianId(event.target.value)}
              >
                <option value="">Välj…</option>
                {musicians.map((musician) => (
                  <option key={musician.id} value={musician.id}>
                    {musician.name}
                  </option>
                ))}
                <option value={NEW_MUSICIAN}>+ Ny musiker…</option>
              </select>
            </label>

            {musicianId === NEW_MUSICIAN ? (
              <label className="min-w-40 flex-1">
                <span className={labelClass}>Nytt namn</span>
                <input
                  className={inputClass}
                  value={newMusicianName}
                  onChange={(event) => setNewMusicianName(event.target.value)}
                />
              </label>
            ) : null}

            <label className="min-w-40 flex-1">
              <span className={labelClass}>Instrument</span>
              <input
                className={inputClass}
                list={instrumentListId}
                value={instrument}
                onChange={(event) => setInstrument(event.target.value)}
                placeholder="t.ex. Akustisk gitarr"
              />
              <datalist id={instrumentListId}>
                {INSTRUMENT_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </label>

            <button
              type="submit"
              className={primaryButtonClass}
              disabled={busy}
            >
              {busy ? "Sparar…" : "Lägg till"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
