interface Env {
  DB: D1Database;
  /** Public CDN base URL, e.g. https://cdn.kruskopf.org (from [vars]). */
  NEXT_PUBLIC_AUDIO_BASE_URL?: string;
}

/** Fallback used when the CDN base URL is not configured. */
const DEFAULT_AUDIO_BASE_URL = "https://cdn.kruskopf.org";

interface DownloadRow {
  wav_path: string | null;
}

/**
 * GET /api/downloads?id=<recording_id> – count a WAV download, then redirect to
 * the file in R2.
 *
 * The public download button points here instead of straight at the CDN, so the
 * click can be counted (the service worker never caches /api/*, so this is not
 * served stale). A redirect is used rather than a JS fetch followed by a
 * navigation, so ordinary clicks, middle-clicks and keyboard activation all
 * work; the R2 object already carries
 * `content-disposition: attachment`, which is what actually triggers the
 * download (the `download` attribute is inert cross-origin).
 *
 * Only public recordings with a WAV are served, so the endpoint cannot be used
 * to reach hidden takes or to inflate a count for a file that is not offered.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const idParam = new URL(context.request.url).searchParams.get("id");
  const recordingId = idParam === null ? NaN : Number(idParam);
  if (!Number.isInteger(recordingId) || recordingId <= 0) {
    return Response.json(
      { error: "id query parameter must be a positive integer" },
      { status: 400 }
    );
  }

  try {
    const recording = await context.env.DB.prepare(
      `SELECT wav_path FROM recordings WHERE id = ? AND is_public = 1`
    )
      .bind(recordingId)
      .first<DownloadRow>();

    if (!recording?.wav_path) {
      return Response.json({ error: "Download not found" }, { status: 404 });
    }

    // COALESCE guards against rows inserted without download_count.
    await context.env.DB.prepare(
      `UPDATE recordings
       SET download_count = COALESCE(download_count, 0) + 1
       WHERE id = ?`
    )
      .bind(recordingId)
      .run();

    const baseUrl =
      context.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? DEFAULT_AUDIO_BASE_URL;
    return Response.redirect(
      `${baseUrl}/parlband/wav/${recording.wav_path}`,
      302
    );
  } catch (error) {
    console.error("Failed to register download", error);
    return Response.json(
      { error: "Failed to register download" },
      { status: 500 }
    );
  }
};
