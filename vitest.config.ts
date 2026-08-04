import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // `tests/live/` makes real, billed API calls and needs a key. It must never
    // run as part of `pnpm test`, which every contributor and CI job runs.
    // `vitest.live.config.ts` is the only config that includes it.
    exclude: [...configDefaults.exclude, "tests/live/**"],
  },
});
