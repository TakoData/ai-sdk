import { defineConfig } from "vitest/config";

/**
 * The live suite only. Kept in its own config so `pnpm test` cannot pick these
 * up: they need a real key and they cost money.
 *
 * Serial by design. The tests compare responses across requests, and Tako
 * throttles per key, so a parallel run makes both the comparisons and the rate
 * limit unpredictable.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    retry: 1, // one retry absorbs a transient 5xx without hiding a real failure
  },
});
