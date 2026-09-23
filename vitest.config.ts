import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the Pages Functions helpers (currently the Cloudflare Access
 * guard) and for the pure draft/payload mapping helpers in components/admin/*.
 * The Functions run in the Workers runtime, so the tests stay on the plain Node
 * environment and exercise the pure helpers with jose only.
 *
 * The `@` alias mirrors tsconfig.json so component modules that import from
 * `@/data/*` resolve in tests as they do in the app.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
