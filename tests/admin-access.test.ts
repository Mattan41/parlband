import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWTVerifyGetKey,
} from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  ACCESS_JWT_HEADER,
  getAccessConfig,
  getAccessIdentity,
  isLocalDevelopment,
  normalizeTeamDomain,
  onRequest,
  verifyAccessRequest,
  verifyAccessToken,
  type AccessConfig,
} from "../functions/api/admin/_middleware";

const TEAM_DOMAIN = "https://knishopf.cloudflareaccess.com";
const AUDIENCE = "test-application-aud";
const EMAIL = "mats@example.com";

const PRODUCTION_URL = "https://parlband.kruskopf.org/api/admin/songs";
const LOCAL_URL = "http://localhost:8788/api/admin/songs";

const CONFIG: AccessConfig = { teamDomain: TEAM_DOMAIN, audience: AUDIENCE };

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let publicJwk: JWK;
let jwks: JWTVerifyGetKey;

interface TokenOptions {
  issuer?: string;
  audience?: string;
  /** NumericDate (seconds) or a duration string understood by jose. */
  expiration?: string | number;
  key?: CryptoKey;
  kid?: string;
  email?: string | null;
}

/** Sign a token with the test key unless another key is given. */
async function signToken(options: TokenOptions = {}): Promise<string> {
  const payload: Record<string, unknown> = {};
  if (options.email !== null) payload.email = options.email ?? EMAIL;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: options.kid ?? "test-key" })
    .setIssuer(options.issuer ?? TEAM_DOMAIN)
    .setAudience(options.audience ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(options.expiration ?? "5m")
    .sign(options.key ?? privateKey);
}

function productionEnv(overrides: Partial<Env> = {}): Env {
  return {
    CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
    CF_ACCESS_AUD: AUDIENCE,
    ...overrides,
  } as unknown as Env;
}

interface MiddlewareResult {
  response: Response;
  data: Record<string, unknown>;
}

/** Run the middleware against a minimal fake Pages context. */
async function runMiddleware(
  request: Request,
  env: Env
): Promise<MiddlewareResult> {
  const data: Record<string, unknown> = {};
  const context = {
    request,
    env,
    data,
    params: {},
    functionPath: new URL(request.url).pathname,
    waitUntil: () => {},
    passThroughOnException: () => {},
    next: async () => Response.json({ ok: true }),
  };

  const response = await onRequest(
    context as unknown as Parameters<typeof onRequest>[0]
  );
  return { response, data };
}

beforeAll(async () => {
  const primary = await generateKeyPair("RS256");
  const other = await generateKeyPair("RS256");
  privateKey = primary.privateKey;
  otherPrivateKey = other.privateKey;
  publicJwk = {
    ...(await exportJWK(primary.publicKey)),
    kid: "test-key",
    alg: "RS256",
    use: "sig",
  };
  jwks = createLocalJWKSet({ keys: [publicJwk] });

  // The middleware builds its own createRemoteJWKSet, so serve the test JWKS
  // from the matching "remote" endpoint instead of hitting the network.
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url === `${TEAM_DOMAIN}/cdn-cgi/access/certs`) {
      return Response.json({ keys: [publicJwk] });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("normalizeTeamDomain", () => {
  it("normalizes a missing scheme and trailing slashes", () => {
    expect(normalizeTeamDomain("knishopf.cloudflareaccess.com")).toBe(
      TEAM_DOMAIN
    );
    expect(normalizeTeamDomain("knishopf.cloudflareaccess.com/")).toBe(
      TEAM_DOMAIN
    );
    expect(normalizeTeamDomain(`${TEAM_DOMAIN}/`)).toBe(TEAM_DOMAIN);
    expect(normalizeTeamDomain("http://knishopf.cloudflareaccess.com")).toBe(
      TEAM_DOMAIN
    );
  });

  it("rejects missing or unusable values", () => {
    expect(normalizeTeamDomain(undefined)).toBeNull();
    expect(normalizeTeamDomain("   ")).toBeNull();
    expect(normalizeTeamDomain(`${TEAM_DOMAIN}/some/path`)).toBeNull();
  });
});

describe("getAccessConfig", () => {
  it("returns null when the team domain or audience is missing", () => {
    expect(getAccessConfig({ CF_ACCESS_AUD: AUDIENCE })).toBeNull();
    expect(getAccessConfig({ CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN })).toBeNull();
  });

  it("normalizes both team-domain forms to the same issuer", async () => {
    const withScheme = getAccessConfig({
      CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
      CF_ACCESS_AUD: AUDIENCE,
    });
    const withoutScheme = getAccessConfig({
      CF_ACCESS_TEAM_DOMAIN: "knishopf.cloudflareaccess.com/",
      CF_ACCESS_AUD: AUDIENCE,
    });

    expect(withScheme?.teamDomain).toBe(TEAM_DOMAIN);
    expect(withoutScheme?.teamDomain).toBe(TEAM_DOMAIN);

    // The same token verifies with either spelling of the env var.
    const token = await signToken();
    expect(await verifyAccessToken(token, withScheme!, jwks)).toEqual({
      email: EMAIL,
    });
    expect(await verifyAccessToken(token, withoutScheme!, jwks)).toEqual({
      email: EMAIL,
    });
  });
});

describe("verifyAccessToken", () => {
  it("accepts a valid token and exposes the email claim", async () => {
    const token = await signToken();
    expect(await verifyAccessToken(token, CONFIG, jwks)).toEqual({
      email: EMAIL,
    });
  });

  it("rejects an expired token", async () => {
    const token = await signToken({
      expiration: Math.floor(Date.now() / 1000) - 60,
    });
    expect(await verifyAccessToken(token, CONFIG, jwks)).toBeNull();
  });

  it("rejects a token with the wrong audience", async () => {
    const token = await signToken({ audience: "some-other-aud" });
    expect(await verifyAccessToken(token, CONFIG, jwks)).toBeNull();
  });

  it("rejects a token with the wrong issuer", async () => {
    const token = await signToken({
      issuer: "https://evil.cloudflareaccess.com",
    });
    expect(await verifyAccessToken(token, CONFIG, jwks)).toBeNull();
  });

  it("rejects a token signed by a different key", async () => {
    // Same kid as the trusted JWKS key, so only the signature differs.
    const token = await signToken({ key: otherPrivateKey });
    expect(await verifyAccessToken(token, CONFIG, jwks)).toBeNull();
  });
});

describe("verifyAccessRequest", () => {
  it("returns null when the Access header is missing", async () => {
    expect(
      await verifyAccessRequest(new Request(PRODUCTION_URL), CONFIG, jwks)
    ).toBeNull();
  });

  it("verifies the token from the Access header", async () => {
    const token = await signToken();
    const request = new Request(PRODUCTION_URL, {
      headers: { [ACCESS_JWT_HEADER]: token },
    });
    expect(await verifyAccessRequest(request, CONFIG, jwks)).toEqual({
      email: EMAIL,
    });
  });
});

describe("isLocalDevelopment", () => {
  it("requires both NODE_ENV=development and a localhost URL", () => {
    expect(
      isLocalDevelopment(
        productionEnv({ NODE_ENV: "development" }),
        new Request(LOCAL_URL)
      )
    ).toBe(true);
    expect(
      isLocalDevelopment(
        productionEnv({ NODE_ENV: "development" }),
        new Request(PRODUCTION_URL)
      )
    ).toBe(false);
    expect(isLocalDevelopment(productionEnv(), new Request(LOCAL_URL))).toBe(
      false
    );
  });
});

describe("admin middleware", () => {
  it("returns a generic 401 when the header is missing", async () => {
    const { response } = await runMiddleware(
      new Request(PRODUCTION_URL),
      productionEnv()
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when the CF_ACCESS_* config is missing", async () => {
    const token = await signToken();
    const { response } = await runMiddleware(
      new Request(PRODUCTION_URL, {
        headers: { [ACCESS_JWT_HEADER]: token },
      }),
      {} as unknown as Env
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 for an invalid token", async () => {
    const { response } = await runMiddleware(
      new Request(PRODUCTION_URL, {
        headers: { [ACCESS_JWT_HEADER]: "not-a-jwt" },
      }),
      productionEnv()
    );

    expect(response.status).toBe(401);
  });

  it("cannot be bypassed with a request header or query parameter", async () => {
    const request = new Request(
      `${PRODUCTION_URL}?skipAccess=1&access=dev&email=${EMAIL}`,
      { headers: { "x-skip-access": "1", "x-access-email": EMAIL } }
    );
    const { response } = await runMiddleware(request, productionEnv());

    expect(response.status).toBe(401);
  });

  it("passes valid requests through and exposes the email", async () => {
    const token = await signToken();
    const { response, data } = await runMiddleware(
      new Request(PRODUCTION_URL, {
        headers: { [ACCESS_JWT_HEADER]: token },
      }),
      productionEnv()
    );

    expect(response.status).toBe(200);
    expect(getAccessIdentity(data)?.email).toBe(EMAIL);
  });

  it("skips validation for local development on localhost", async () => {
    const { response, data } = await runMiddleware(
      new Request(LOCAL_URL),
      productionEnv({ NODE_ENV: "development" })
    );

    expect(response.status).toBe(200);
    expect(getAccessIdentity(data)).toBeNull();
  });

  it("still enforces validation with NODE_ENV=development on a non-local hostname", async () => {
    const { response } = await runMiddleware(
      new Request(PRODUCTION_URL),
      productionEnv({ NODE_ENV: "development" })
    );

    expect(response.status).toBe(401);
  });
});
