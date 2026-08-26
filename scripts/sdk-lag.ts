import semver from "semver";

/**
 * Detect a `tako-sdk` release this package's range can no longer reach.
 *
 * A caret range trails a major forever with no signal: Dependabot opens a PR
 * nobody is forced to read, and consumers keep installing the old major. This
 * check fails CI instead.
 *
 * Ranges are npm's grammar, so npm's parser answers the question. Reading the
 * leading major by hand looked equivalent and wasn't: it called `^0.3.1`
 * against a published `0.4.0` reachable, when `^0.3.1` stops below `0.4.0` —
 * the 0.x case a lag guard exists for. It also called `1.3.0 || 2.0.0` lagging
 * behind a published `2.0.0` the range names outright, and threw on `<2.0.0`
 * and `*`.
 */
export function isLagging(range: string, latest: string): boolean {
  if (!semver.validRange(range)) {
    throw new Error(`cannot read a dependency range from ${JSON.stringify(range)}`);
  }
  return !semver.satisfies(latest, range);
}
