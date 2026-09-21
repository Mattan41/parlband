"use client";

import { useId, useState } from "react";
import { adminJson, type AdminCredit, type AdminMusician } from "@/data/admin";
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

interface Props {
  recordingId: number | null;
  credits: AdminCredit[];
  musicians: AdminMusician[];
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

export default function CreditsEditor({
  recordingId,
  credits,
  musicians,
  onChanged,
  notify,
}: Props) {
  const [musicianId, setMusicianId] = useState<string>("");
  const [newMusicianName, setNewMusicianName] = useState("");
  const [instrument, setInstrument] = useState("");
  const [busy, setBusy] = useState(false);
  // Unique per editor instance: several recording cards may be mounted at once.
  const instrumentListId = useId();

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (recordingId === null) return;

    const trimmedInstrument = instrument.trim();
    if (!trimmedInstrument) {
      notify("Ange ett instrument.", "error");
      return;
    }

    let resolvedMusicianId: number | null = null;
    if (musicianId === NEW_MUSICIAN) {
      const name = newMusicianName.trim();
      if (!name) {
        notify("Ange namnet på den nya musikern.", "error");
        return;
      }
      try {
        setBusy(true);
        const created = await adminJson<{ musician: AdminMusician }>(
          "/api/admin/musicians",
          "POST",
          { name }
        );
        resolvedMusicianId = created.musician.id;
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Kunde inte skapa musikern",
          "error"
        );
        setBusy(false);
        return;
      }
    } else {
      resolvedMusicianId = Number(musicianId);
    }

    if (!resolvedMusicianId) {
      notify("Välj en musiker.", "error");
      setBusy(false);
      return;
    }

    try {
      await adminJson("/api/admin/credits", "POST", {
        recording_id: recordingId,
        musician_id: resolvedMusicianId,
        instrument: trimmedInstrument,
      });
      notify("Credit tillagd.", "success");
      setInstrument("");
      setNewMusicianName("");
      setMusicianId("");
      await onChanged();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Kunde inte lägga till credit",
        "error"
      );
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
      await adminJson(`/api/admin/credits?${params.toString()}`, "DELETE");
      notify("Credit borttagen.", "success");
      await onChanged();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Kunde inte ta bort credit",
        "error"
      );
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
              Lägg till
            </button>
          </form>
        </>
      )}
    </div>
  );
}
