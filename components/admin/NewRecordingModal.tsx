"use client";

import { useState } from "react";
import type { AdminMusician, AdminSong } from "@/data/admin";
import AdminModal from "./AdminModal";
import RecordingCard from "./RecordingCard";

interface Props {
  /** The song to add a recording to, or null when the modal is closed. */
  song: AdminSong | null;
  musicians: AdminMusician[];
  onClose: () => void;
  /** Called with the new recording's id after a successful create. */
  onCreated?: (recordingId: number) => void;
  onMusiciansChanged?: () => Promise<void>;
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

/** Modal for creating a new recording on an existing song. */
export default function NewRecordingModal({
  song,
  musicians,
  onClose,
  onCreated,
  onMusiciansChanged,
  onChanged,
  notify,
}: Props) {
  // `busy` keeps Esc/backdrop from closing while a request runs; `dirty` makes
  // the other close paths ask before dropping unsaved input.
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function reset() {
    setBusy(false);
    setDirty(false);
  }

  /** Esc, backdrop, × and Avbryt all land here. */
  function handleClose() {
    if (busy) return;
    if (dirty && !window.confirm("Du har osparade ändringar. Stäng ändå?")) {
      return;
    }
    reset();
    onClose();
  }

  /** A successful save closes without the unsaved-changes prompt. */
  function handleCreated(recordingId: number) {
    reset();
    onClose();
    onCreated?.(recordingId);
  }

  return (
    <AdminModal
      open={song !== null}
      title={song ? `Ny inspelning – ${song.title}` : "Ny inspelning"}
      help="Lägg till en inspelning på låten. Fyll i uppgifterna och ladda gärna upp MP3 och omslag – uppladdningen fyller i sökvägen åt dig. Inspelningen är publik tills du avmarkerar Publik. Efter att inspelningen sparats kan du koppla medverkande (credits)."
      busy={busy}
      onClose={handleClose}
    >
      {song ? (
        <RecordingCard
          song={song}
          recording={null}
          musicians={musicians}
          onChanged={onChanged}
          notify={notify}
          onCancel={handleClose}
          onCreated={handleCreated}
          onBusyChange={setBusy}
          onDirtyChange={setDirty}
          onMusiciansChanged={onMusiciansChanged}
        />
      ) : null}
    </AdminModal>
  );
}
