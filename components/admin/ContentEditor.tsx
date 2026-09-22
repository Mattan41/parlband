"use client";

import { useState } from "react";
import Link from "next/link";
import { adminJson } from "@/data/admin";
import type { SiteContent } from "@/data/content";
import { inputClass, labelClass, primaryButtonClass } from "./adminStyles";
import { blockEnterSubmit } from "./adminForms";

interface Props {
  /** Copy loaded by the page, used as the initial (and "saved") value. */
  initialContent: SiteContent;
}

/** True when the draft matches the last saved copy (save button stays off). */
function contentEquals(a: SiteContent, b: SiteContent): boolean {
  return (
    a.welcomeText === b.welcomeText &&
    a.aboutHeading === b.aboutHeading &&
    a.aboutBody === b.aboutBody
  );
}

/**
 * Editor for the editable page copy: the welcome line on the landing page and
 * the heading + body of /about.
 *
 * Saving writes through PUT /api/admin/content; the read side is the public
 * GET /api/content, so there is no separate admin GET. The draft is seeded once
 * – after a save it becomes the new baseline, so the button disables again.
 */
export default function ContentEditor({ initialContent }: Props) {
  const [draft, setDraft] = useState<SiteContent>(initialContent);
  const [saved, setSaved] = useState<SiteContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);

  const isDirty = !contentEquals(draft, saved);

  function update(patch: Partial<SiteContent>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await adminJson("/api/admin/content", "PUT", { ...draft });
      setSaved(draft);
      setFeedback({ text: "Texterna sparades.", tone: "success" });
    } catch (cause) {
      setFeedback({
        text:
          cause instanceof Error ? cause.message : "Kunde inte spara texterna",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Texter på sidorna
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Välkomsttexten visas på startsidan, rubriken och texten på /about.
            Radbrytningar bevaras i välkomsttexten och i Om oss-texten; rubriken
            är en enkel rad. En tom välkomsttext döljer raden, och en tom rubrik
            blir ”Om oss”. Enter sparar inte – använd Spara texterna.
          </p>
        </div>
        <Link
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-700 underline underline-offset-4 dark:text-amber-400"
        >
          Visa sidan ↗
        </Link>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={blockEnterSubmit}>
        <label>
          <span className={labelClass}>Välkomsttext (startsidan)</span>
          <textarea
            className={`${inputClass} min-h-24`}
            value={draft.welcomeText}
            onChange={(event) => update({ welcomeText: event.target.value })}
          />
        </label>

        <label className="mt-4">
          <span className={labelClass}>Rubrik (Om oss-sidan)</span>
          <input
            className={inputClass}
            value={draft.aboutHeading}
            onChange={(event) => update({ aboutHeading: event.target.value })}
          />
        </label>

        <label className="mt-4">
          <span className={labelClass}>Text (Om oss-sidan)</span>
          <textarea
            className={`${inputClass} min-h-64`}
            value={draft.aboutBody}
            onChange={(event) => update({ aboutBody: event.target.value })}
          />
        </label>

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
            {saving ? "Sparar…" : "Spara texterna"}
          </button>
        </div>
      </form>
    </section>
  );
}
