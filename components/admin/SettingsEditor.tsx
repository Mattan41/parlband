"use client";

import { useState } from "react";
import { adminJson } from "@/data/admin";
import {
  PLAYBACK_MODES,
  type PlaybackMode,
  type SiteSettings,
} from "@/data/settings";
import { labelClass, primaryButtonClass } from "./adminStyles";

interface Props {
  /** Settings loaded by the page, used as the initial (and "saved") value. */
  initialSettings: SiteSettings;
}

/** Swedish UI copy for the player's end-of-queue behaviour. */
const PLAYBACK_MODE_OPTIONS: Record<
  PlaybackMode,
  { label: string; help: string }
> = {
  none: {
    label: "Ingen nästa",
    help: "När låten tar slut och kön är tom stannar spelaren.",
  },
  once: {
    label: "Ett varv",
    help: "Spelar igenom hela låtlistan en gång och stannar sedan.",
  },
  loop: {
    label: "Oändlig loop",
    help: "Fortsätter med nästa låt och börjar om från början när listan tar slut.",
  },
};

/** True when the draft matches the last saved settings (save stays off). */
function settingsEqual(a: SiteSettings, b: SiteSettings): boolean {
  return a.playbackMode === b.playbackMode;
}

/**
 * Editor for the site-wide settings, currently the sticky player's
 * end-of-queue behaviour.
 *
 * Saving writes through PUT /api/admin/settings; the read side is the public
 * GET /api/settings, so there is no separate admin GET. The draft is seeded once
 * – after a save it becomes the new baseline, so the button disables again.
 */
export default function SettingsEditor({ initialSettings }: Readonly<Props>) {
  const [draft, setDraft] = useState<SiteSettings>(initialSettings);
  const [saved, setSaved] = useState<SiteSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);

  const isDirty = !settingsEqual(draft, saved);

  function update(playbackMode: PlaybackMode) {
    setDraft({ playbackMode });
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await adminJson("/api/admin/settings", "PUT", { ...draft });
      setSaved(draft);
      setFeedback({ text: "Inställningarna sparades.", tone: "success" });
    } catch (cause) {
      setFeedback({
        text:
          cause instanceof Error
            ? cause.message
            : "Kunde inte spara inställningarna",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Uppspelning
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Vad spelaren gör när kön är tom och en låt har spelat klart.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend className={labelClass}>När kön är tom</legend>
          <div className="mt-2 space-y-2">
            {PLAYBACK_MODES.map((mode) => {
              const option = PLAYBACK_MODE_OPTIONS[mode];
              const checked = draft.playbackMode === mode;

              // The wrapping <label>, not an explicit htmlFor, associates the
              // radio with its text (same implicit pattern as the other editors).
              return (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition ${
                    checked
                      ? "border-amber-400 bg-amber-50 dark:border-amber-500/70 dark:bg-amber-500/10"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="playbackMode"
                    value={mode}
                    checked={checked}
                    onChange={() => update(mode)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {option.label}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {option.help}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {feedback ? (
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
        ) : null}

        <div className="mt-3">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={saving || !isDirty}
          >
            {saving ? "Sparar…" : "Spara inställningarna"}
          </button>
        </div>
      </form>
    </section>
  );
}
