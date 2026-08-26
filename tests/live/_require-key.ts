/**
 * Fail a keyless live run in CI, instead of passing it.
 *
 * Every describe in this suite is `describe.skipIf(!KEY)`, which is right for a
 * contributor with no key: they get skips, not red. In CI it inverts. The
 * `live` workflow exists to run these tests, so a missing `TAKO_API_KEY` secret
 * means 19 silent skips and a green job that proved nothing — the same shape as
 * a check nobody can fail. That is how a broken transport ships.
 *
 * Wired as `globalSetup` in vitest.live.config.ts, so it runs once and takes
 * the whole run down with a message naming the fix.
 */
export default function requireKey(): void {
  if (!process.env.CI) return;
  if (process.env.TAKO_API_KEY || process.env.TAKO_API_TOKEN) return;
  throw new Error(
    "the live suite ran in CI with no TAKO_API_KEY, so every test would skip and the job " +
      "would pass having tested nothing. Add TAKO_API_KEY to the repository secrets.",
  );
}
