/**
 * Shared request helpers for the admin Pages Functions, kept in one module so
 * every route parses bodies and builds error responses the same way.
 */

/**
 * Read the JSON body, returning null when it is missing or malformed.
 * Mirrors the defensive parsing used by functions/api/plays.ts.
 */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}

/** `400 Bad Request`, with an optional machine-readable `code`. */
export function badRequest(error: string, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status: 400 });
}

/** Error response with a custom status (e.g. `404`, `409`) and an optional code. */
export function errorResponse(
  error: string,
  status: number,
  code?: string
): Response {
  return Response.json(code ? { error, code } : { error }, { status });
}
