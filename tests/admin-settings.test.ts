import { describe, expect, it, vi } from "vitest";

import { PLAYBACK_MODES } from "../data/settings";
import { onRequestPut } from "../functions/api/admin/settings";

/** One statement as the fake D1 keeps track of it. */
interface FakeStatement {
  sql: string;
  values: unknown[];
  /** True once `run()` was called – the only thing that reaches D1. */
  executed: boolean;
}

/** The statement double the route's `prepare().bind().run()` chain expects. */
interface FakePreparedStatement {
  bind(...values: unknown[]): FakePreparedStatement;
  run(): Promise<{ success: boolean }>;
}

type FakeD1Options = {
  /** When given, `run()` rejects so the route's error path can be exercised. */
  runError?: Error;
};

/**
 * Minimal D1 double for the route: records every prepared statement and whether
 * the endpoint actually executed it with `run()`.
 *
 * This is the regression the test exists for: `bind()` alone only builds a
 * statement, so a route that awaits it answers `200` while D1 stays untouched.
 */
function fakeD1(options: FakeD1Options = {}) {
  const statements: FakeStatement[] = [];

  function prepare(sql: string): FakePreparedStatement {
    const statement: FakeStatement = { sql, values: [], executed: false };
    statements.push(statement);

    const prepared: FakePreparedStatement = {
      bind(...values: unknown[]) {
        statement.values = values;
        return prepared;
      },
      run() {
        if (options.runError) return Promise.reject(options.runError);
        statement.executed = true;
        return Promise.resolve({ success: true });
      },
    };

    return prepared;
  }

  return { statements, DB: { prepare } as unknown as D1Database };
}

const ENDPOINT = "https://parlband.kruskopf.org/api/admin/settings";

/** Run the PUT handler against the fake D1 with an already encoded body. */
async function putSettings(db: D1Database, body: string): Promise<Response> {
  const request = new Request(ENDPOINT, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  });

  const context = {
    request,
    env: { DB: db },
    params: {},
    data: {},
    functionPath: new URL(request.url).pathname,
    waitUntil: () => {},
    passThroughOnException: () => {},
    next: async () => Response.json({ ok: true }),
  };

  return onRequestPut(context as unknown as Parameters<typeof onRequestPut>[0]);
}

describe("PUT /api/admin/settings", () => {
  it("executes the upsert with the chosen mode", async () => {
    const { statements, DB } = fakeD1();

    const response = await putSettings(
      DB,
      JSON.stringify({ playbackMode: "once" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      playbackMode: "once",
    });

    // The write is the point: without `.run()` the route still returns 200 and
    // the mode never reaches D1, so /admin/settings keeps showing the old value.
    expect(statements).toHaveLength(1);
    expect(statements[0].values).toEqual(["playback_mode", "once"]);
    expect(statements[0].executed).toBe(true);
  });

  it("upserts the row, so a database without the seed row still stores it", async () => {
    const { statements, DB } = fakeD1();

    await putSettings(DB, JSON.stringify({ playbackMode: "none" }));

    expect(statements[0].sql).toContain("INSERT INTO site_content");
    expect(statements[0].sql).toContain("ON CONFLICT(key) DO UPDATE");
  });

  it("stores every mode the admin UI offers", async () => {
    for (const mode of PLAYBACK_MODES) {
      const { statements, DB } = fakeD1();

      const response = await putSettings(
        DB,
        JSON.stringify({ playbackMode: mode })
      );

      expect(response.status).toBe(200);
      expect(statements[0].values).toEqual(["playback_mode", mode]);
      expect(statements[0].executed).toBe(true);
    }
  });

  it("refuses an unknown mode without preparing a statement", async () => {
    const { statements, DB } = fakeD1();

    const response = await putSettings(
      DB,
      JSON.stringify({ playbackMode: "shuffle" })
    );

    expect(response.status).toBe(400);
    expect(statements).toHaveLength(0);
  });

  it("refuses a malformed body without preparing a statement", async () => {
    const { statements, DB } = fakeD1();

    const response = await putSettings(DB, "{not json");

    expect(response.status).toBe(400);
    expect(statements).toHaveLength(0);
  });

  it("surfaces a failing write as a 500 instead of a success", async () => {
    const { DB } = fakeD1({ runError: new Error("D1_ERROR") });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await putSettings(
      DB,
      JSON.stringify({ playbackMode: "once" })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to save site settings",
    });
    expect(logged).toHaveBeenCalled();

    logged.mockRestore();
  });
});
