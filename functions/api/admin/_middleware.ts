import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Shared Cloudflare Access guard for every route under `functions/api/admin/`.
 *
 * Access runs at Cloudflare's edge, but its policy can be bypassed by a
 * misconfigured destination (e.g. protecting only the UI route) or by an
 * internal request that never passed through the edge. This middleware adds an
 * application-level check of the signed `Cf-Access-Jwt-Assertion` JWT so the
 * write endpoints are safe on their own. It runs for the whole directory,
 * including subdirectories, so no individual route has to repeat the check.
 */

/** Header Cloudflare Access adds to requests that passed its policy. */
export const ACCESS_JWT_HEADER = "Cf-Access-Jwt-Assertion";

/** The identity an Access JWT proves, exposed to routes on `context.data`. */
export interface AccessIdentity {
  /** Email from the Access JWT `email` claim; null when the claim is absent. */
  email: string | null;
}

/** Normalized Cloudflare Access configuration read from the environment. */
export interface AccessConfig {
  /** `https://<team>.cloudflareaccess.com`; also the expected `iss` claim. */
  teamDomain: string;
  /** Application Audience (AUD) tag of the Access application. */
  audience: string;
}

/** The environment slice the Access guard needs. */
type AccessEnv = Pick<
  Env,
  "CF_ACCESS_TEAM_DOMAIN" | "CF_ACCESS_AUD" | "NODE_ENV"
>;

/**
 * Cloudflare Access signs with RS256 only, so pin the algorithm instead of
 * trusting the `alg` header of the token.
 */
const ACCESS_ALGORITHMS = ["RS256"];

/**
 * Normalize `CF_ACCESS_TEAM_DOMAIN` to exactly `https://<team>.cloudflareaccess.com`:
 * a missing (or plain `http`) scheme becomes `https`, trailing slashes are
 * dropped, and a value carrying a path/query/hash is rejected. Returns null when
 * the value is missing or unusable.
 */
export function normalizeTeamDomain(value: string | undefined): string | null {
  if (!value) return null;

  const withoutScheme = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  if (!withoutScheme) return null;

  try {
    const url = new URL(`https://${withoutScheme}`);
    if (url.pathname !== "/" || url.search || url.hash) return null;
    // `.origin` is exactly `https://<host>` – no trailing slash.
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Read and normalize the Access configuration. Returns null when either value
 * is missing or unusable, which makes the middleware fail closed.
 */
export function getAccessConfig(env: AccessEnv): AccessConfig | null {
  const teamDomain = normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN);
  const audience = env.CF_ACCESS_AUD?.trim();
  if (!teamDomain || !audience) return null;
  return { teamDomain, audience };
}

/**
 * Validation is skipped only in local development, and only when both an
 * explicit `NODE_ENV=development` and a `localhost` request URL are present.
 * A deployed environment (no `NODE_ENV=development`) or a request header/query
 * parameter can therefore never disable the guard.
 */
export function isLocalDevelopment(env: AccessEnv, request: Request): boolean {
  if (env.NODE_ENV !== "development") return false;
  try {
    return new URL(request.url).hostname === "localhost";
  } catch {
    return false;
  }
}

/** One remote JWK set per team domain, reused for the isolate's lifetime. */
const remoteJwks = new Map<string, JWTVerifyGetKey>();

function jwksFor(teamDomain: string): JWTVerifyGetKey {
  let jwks = remoteJwks.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    remoteJwks.set(teamDomain, jwks);
  }
  return jwks;
}

/**
 * Verify an Access JWT: signature, issuer, audience and expiry (jose checks
 * `exp`/`nbf` on its own). Returns the identity, or null when the token is
 * missing, malformed or invalid. The token is never logged.
 */
export async function verifyAccessToken(
  token: string,
  config: AccessConfig,
  jwks: JWTVerifyGetKey = jwksFor(config.teamDomain)
): Promise<AccessIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.teamDomain,
      audience: config.audience,
      algorithms: ACCESS_ALGORITHMS,
    });
    return { email: typeof payload.email === "string" ? payload.email : null };
  } catch {
    // Every failure is the same generic 401 at the call site; never echo the
    // token or the verification error.
    return null;
  }
}

/** Read `Cf-Access-Jwt-Assertion` and verify it; null when absent or invalid. */
export async function verifyAccessRequest(
  request: Request,
  config: AccessConfig,
  jwks?: JWTVerifyGetKey
): Promise<AccessIdentity | null> {
  const token = request.headers.get(ACCESS_JWT_HEADER);
  if (!token) return null;
  return verifyAccessToken(token, config, jwks);
}

/** What the middleware stores on `context.data`. */
export interface AccessData {
  access?: AccessIdentity | null;
}

/** Typed reader for the identity the middleware stored on `context.data`. */
export function getAccessIdentity(
  data: Record<string, unknown>
): AccessIdentity | null {
  const value = data.access;
  if (!value || typeof value !== "object") return null;
  const email = (value as { email?: unknown }).email;
  return { email: typeof email === "string" ? email : null };
}

function unauthorized(): Response {
  // Deliberately generic: missing config, missing token and invalid token all
  // look the same from the outside.
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Pages middleware for `/api/admin/*`. Validates the JWT before the route runs
 * and exposes the `email` claim through `context.data.access` so routes can log
 * who made a change:
 *
 *     const email = getAccessIdentity(context.data)?.email;
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  if (isLocalDevelopment(context.env, context.request)) {
    context.data.access = null;
    return context.next();
  }

  const config = getAccessConfig(context.env);
  const identity = config
    ? await verifyAccessRequest(context.request, config)
    : null;
  if (!identity) return unauthorized();

  context.data.access = identity;
  return context.next();
};
