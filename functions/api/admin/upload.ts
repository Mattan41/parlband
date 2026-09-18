/** Song id slug: lowercase ASCII words separated by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type UploadKind = "mp3" | "wav" | "cover";

interface UploadKindConfig {
  /** R2 key prefix, matching the existing parlband/ convention. */
  prefix: string;
  /** File extension, or null when it is derived from the content type. */
  extension: string | null;
  maxBytes: number;
  contentTypes: string[];
}

const KIND_CONFIG: Record<UploadKind, UploadKindConfig> = {
  mp3: {
    prefix: "parlband/mp3",
    extension: "mp3",
    // Kept conservative: the request body is streamed straight into R2, and the
    // isolate has a hard memory ceiling that multipart-free streaming avoids but
    // cannot exceed either.
    maxBytes: 25 * 1024 * 1024,
    contentTypes: [
      "audio/mpeg",
      "audio/mp3",
      "audio/x-mp3",
      "application/octet-stream",
    ],
  },
  wav: {
    prefix: "parlband/wav",
    extension: "wav",
    maxBytes: 50 * 1024 * 1024,
    contentTypes: [
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/vnd.wave",
      "application/octet-stream",
    ],
  },
  cover: {
    prefix: "parlband/images",
    extension: null,
    maxBytes: 10 * 1024 * 1024,
    contentTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ],
  },
};

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const kindParam = url.searchParams.get("kind") ?? "";
  if (!(kindParam in KIND_CONFIG)) {
    return badRequest("kind must be one of: mp3, wav, cover");
  }
  const kind = kindParam as UploadKind;
  const config = KIND_CONFIG[kind];

  const songId = (url.searchParams.get("song_id") ?? "").trim();
  if (!SLUG_PATTERN.test(songId)) {
    return badRequest(
      "song_id must be a slug (lowercase a-z, 0-9 and hyphens)"
    );
  }

  let recordingId: number | null = null;
  const recordingIdParam = url.searchParams.get("recording_id");
  if (recordingIdParam !== null && recordingIdParam !== "") {
    const parsed = Number(recordingIdParam);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return badRequest("recording_id must be a positive integer");
    }
    recordingId = parsed;
  }

  const contentType = (context.request.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!config.contentTypes.includes(contentType)) {
    return badRequest(`Unsupported content type '${contentType}' for ${kind}`);
  }

  // Content-Length is present for normal browser uploads; a missing header (e.g.
  // a chunked request) simply skips this guard.
  const contentLength = Number(context.request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > config.maxBytes) {
    return Response.json(
      {
        error: `File is larger than the ${Math.round(config.maxBytes / 1024 / 1024)} MB limit for ${kind}`,
      },
      { status: 413 }
    );
  }

  const body = context.request.body;
  if (!body) return badRequest("Request body must contain the file");

  const extension =
    kind === "cover"
      ? (IMAGE_EXTENSIONS[contentType] ?? "jpg")
      : (config.extension as string);
  const fileName = `${songId}.${extension}`;
  const key = `${config.prefix}/${fileName}`;

  try {
    if (recordingId !== null) {
      const recording = await context.env.DB.prepare(
        `SELECT id FROM recordings WHERE id = ?`
      )
        .bind(recordingId)
        .first<{ id: number }>();
      if (!recording) {
        return Response.json({ error: "Recording not found" }, { status: 404 });
      }
    }

    const httpMetadata: R2HTTPMetadata = {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    };
    // WAV is a download; without this the browser plays it instead (the HTML
    // `download` attribute only works same-origin).
    if (kind === "wav") {
      httpMetadata.contentDisposition = `attachment; filename="${fileName}"`;
    }

    const object = await context.env.CDN.put(key, body, { httpMetadata });

    // When a recording is given, point its column at the freshly stored file so
    // the admin UI does not have to save the path separately.
    if (recordingId !== null) {
      const column =
        kind === "mp3"
          ? "mp3_path"
          : kind === "wav"
            ? "wav_path"
            : "cover_path";
      await context.env.DB.prepare(
        `UPDATE recordings SET ${column} = ? WHERE id = ?`
      )
        .bind(fileName, recordingId)
        .run();
    }

    const baseUrl = context.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? "";
    return Response.json(
      {
        success: true,
        path: fileName,
        key,
        size: object?.size ?? null,
        url: baseUrl ? `${baseUrl}/${key}` : "",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload file", error);
    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
};
