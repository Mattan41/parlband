"use client";

import { useState } from "react";
import AdminModal from "./AdminModal";
import GigFields, {
  emptyGigDraft,
  gigDraftEquals,
  toGigDraft,
  toGigPayload,
  type GigDraft,
} from "./GigFields";
import { adminJson, AdminApiError } from "@/data/admin";
import {
  formatGigDate,
  formatGigTime,
  isPastGig,
  todayIsoDate,
  type GigRow,
} from "@/data/gigs";
import {
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./adminStyles";

interface Feedback {
  text: string;
  tone: "success" | "error";
}

/** Inline feedback block, matching the recording card's look. */
function FeedbackNote({ feedback }: { feedback: Feedback }) {
  return (
    <p
      role="alert"
      className={`mt-3 rounded-md border px-3 py-2 text-sm ${
        feedback.tone === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {feedback.text}
    </p>
  );
}

/**
 * Swedish copy for the validation codes from
 * functions/api/admin/gig-rules.ts.
 *
 * The API messages are English (they are API errors); the codes are the stable
 * contract, so the user-facing text lives here – the same split as `mp3_missing`
 * in the recording editor.
 */
const GIG_ERROR_MESSAGES: Record<string, string> = {
  date_required: "Ange ett datum.",
  date_invalid: "Ogiltigt datum – använd datumväljaren.",
  venue_required: "Ange ett spelställe.",
  time_type: "Tiden måste vara en text (HH:MM).",
  time_invalid: "Ogiltig tid – använd tidsväljaren.",
  city_type: "Ort måste vara en text.",
  ticket_url_type: "Biljettlänken måste vara en text.",
  ticket_url_invalid: "Biljettlänken måste vara en fullständig http(s)-adress.",
  info_type: "Info måste vara en text.",
  gig_not_found: "Datumet finns inte längre – ladda om sidan.",
};

/** Localise a failed gig request, falling back to the API/server message. */
function describeGigError(cause: unknown, fallback: string): string {
  if (cause instanceof AdminApiError && cause.code) {
    const message = GIG_ERROR_MESSAGES[cause.code];
    if (message) return message;
  }
  return cause instanceof Error ? cause.message : fallback;
}

interface SectionProps {
  gigs: GigRow[];
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

/**
 * The gig calendar editor: one expandable row per date plus a modal for new
 * dates. Only one row is open at a time, mirroring the recording accordion.
 */
export default function GigsSection({ gigs, onChanged, notify }: SectionProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Kommande spelningar
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Datum från och med idag visas på startsidan. Passerade datum ligger
            kvar här.
          </p>
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setCreating(true)}
        >
          + Nytt datum
        </button>
      </div>

      {gigs.length === 0 ? (
        <p className="px-4 py-4 text-xs text-zinc-500 dark:text-zinc-400">
          Inga datum ännu. Så länge listan är tom visas inget avsnitt med
          kommande spelningar på startsidan.
        </p>
      ) : (
        <ul>
          {gigs.map((gig) => (
            <GigRowEditor
              key={gig.id}
              gig={gig}
              expanded={openId === gig.id}
              onToggle={() =>
                setOpenId((current) => (current === gig.id ? null : gig.id))
              }
              onDeleted={() =>
                setOpenId((current) => (current === gig.id ? null : current))
              }
              onChanged={onChanged}
              notify={notify}
            />
          ))}
        </ul>
      )}

      <NewGigModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={async () => {
          setCreating(false);
          await onChanged();
        }}
        notify={notify}
      />
    </section>
  );
}
interface RowProps {
  gig: GigRow;
  expanded: boolean;
  onToggle: () => void;
  onDeleted: () => void;
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

function GigRowEditor({
  gig,
  expanded,
  onToggle,
  onDeleted,
  onChanged,
  notify,
}: RowProps) {
  // Seeded once. Reloads do not remount the row, so a draft stays put until it
  // is saved or the page is left.
  const [draft, setDraft] = useState<GigDraft>(() => toGigDraft(gig));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const past = isPastGig(gig.event_date, todayIsoDate());
  const time = formatGigTime(gig.start_time);
  const isDirty = !gigDraftEquals(draft, toGigDraft(gig));

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await adminJson("/api/admin/gigs", "PUT", {
        id: gig.id,
        ...toGigPayload(draft),
      });
      setFeedback({ text: "Datumet sparades.", tone: "success" });
      await onChanged();
    } catch (cause) {
      setFeedback({
        text: describeGigError(cause, "Kunde inte spara datumet"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Ta bort ${formatGigDate(gig.event_date)} – ${gig.venue}?`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await adminJson(`/api/admin/gigs?id=${gig.id}`, "DELETE");
      notify("Datumet togs bort.", "success");
      onDeleted();
      await onChanged();
    } catch (cause) {
      notify(describeGigError(cause, "Kunde inte ta bort datumet"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
          expanded ? "bg-zinc-50 dark:bg-zinc-800/40" : ""
        }`}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formatGigDate(gig.event_date)}
          </span>
          {time ? (
            <span className="text-xs text-zinc-600 dark:text-zinc-300">
              {time}
            </span>
          ) : null}
          <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
            {gig.venue}
            {gig.city ? `, ${gig.city}` : ""}
          </span>
          {past ? (
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              Passerat
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-zinc-400">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Mounted even when collapsed so unsaved drafts survive navigation. */}
      <div
        hidden={!expanded}
        className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800"
      >
        <form onSubmit={handleSave}>
          <GigFields
            draft={draft}
            onChange={(patch) => {
              setDraft((previous) => ({ ...previous, ...patch }));
              setFeedback(null);
            }}
          />

          {feedback ? <FeedbackNote feedback={feedback} /> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={saving || !isDirty}
            >
              {saving ? "Sparar…" : "Spara"}
            </button>
            <button
              type="button"
              className={dangerButtonClass}
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              Ta bort
            </button>
          </div>
        </form>
      </div>
    </li>
  );
}
interface ModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

/** Trigger + modal for adding a brand-new date. */
function NewGigModal({ open, onClose, onCreated, notify }: ModalProps) {
  const [draft, setDraft] = useState<GigDraft>(emptyGigDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !gigDraftEquals(draft, emptyGigDraft);

  /** Closing always goes through here, so unsaved input is never dropped silently. */
  function close() {
    if (saving) return;
    if (isDirty && !window.confirm("Du har osparade ändringar. Stäng ändå?")) {
      return;
    }
    setDraft(emptyGigDraft);
    setError(null);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminJson("/api/admin/gigs", "POST", toGigPayload(draft));
      notify("Datumet skapades.", "success");
      setDraft(emptyGigDraft);
      await onCreated();
    } catch (cause) {
      // The modal stays open with the entered data so it can be corrected.
      setError(describeGigError(cause, "Kunde inte skapa datumet"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal
      open={open}
      title="Nytt datum"
      help="Fyll i datum och spelställe. Datum från och med idag visas under Kommande spelningar på startsidan; en tom lista renderas inte alls. Tid, ort, biljettlänk och info är valfria."
      busy={saving}
      onClose={close}
    >
      <form onSubmit={handleSubmit}>
        <GigFields
          draft={draft}
          onChange={(patch) => {
            setDraft((previous) => ({ ...previous, ...patch }));
            setError(null);
          }}
        />

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={saving}
          >
            {saving ? "Sparar…" : "Skapa datum"}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={close}
            disabled={saving}
          >
            Avbryt
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
