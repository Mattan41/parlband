import type { KeyboardEvent } from "react";

/**
 * Shared keyboard behaviour for the admin forms.
 *
 * A multi-field editor must not save on Enter: a stray keypress in a text
 * `<input>` would submit the whole form and commit a half-written row (a gig, a
 * song, a recording or the page copy). Those forms attach `blockEnterSubmit`, so
 * only the explicit save button submits.
 *
 * `<textarea>` is deliberately exempt – there Enter has to insert a line break –
 * which is why the multi-line fields (lyrics, info, notes) keep working.
 *
 * The single-purpose add/rename forms (components/admin/CreditsEditor.tsx and
 * MusicianOverview.tsx) intentionally do NOT use this: typing a name and
 * pressing Enter is the natural gesture there.
 */
export function blockEnterSubmit(event: KeyboardEvent<HTMLFormElement>): void {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
    event.preventDefault();
  }
}
