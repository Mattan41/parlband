import { defineConfig } from "vitest/config";

/**
 * Unit tests for the Pages Functions helpers (currently the Cloudflare Access
 * guard). The Functions run in the Workers runtime, so the tests stay on the
 * plain Node environment and exercise the pure helpers with jose only.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
