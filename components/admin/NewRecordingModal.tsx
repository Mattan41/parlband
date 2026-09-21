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
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

/** Modal for creating a new recording on an existing song. */
export default function NewRecordingModal({
  song,
  musicians,
  onClose,
  onChanged,
  notify,
}: Props) {
  // The busy flag lives here so the modal shell can keep Esc/backdrop from
  // closing it while an upload or save is in flight.
  const [busy, setBusy] = useState(false);

  function handleClose() {
    setBusy(false);
    onClose();
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
          onBusyChange={setBusy}
        />
      ) : null}
    </AdminModal>
  );
}
