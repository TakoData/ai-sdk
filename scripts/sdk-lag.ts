/**
 * Detect a `tako-sdk` major this package's range can no longer reach.
 *
 * A caret range trails a major forever with no signal: Dependabot opens a PR
 * nobody is forced to read, and consumers keep installing the old major. This
 * check fails CI instead. It reads only the leading major of simple ranges
 * (`^x`, `~x`, `x`, `>=x`), which is every range this package uses.
 */
export function rangeMajor(range: string): number {
  const match = /^\s*(?:\^|~|>=|=)?\s*v?(\d+)(?:\.|$)/.exec(range);
  if (!match) throw new Error(`cannot read a major from dependency range ${JSON.stringify(range)}`);
  return Number(match[1]);
}

export function isLagging(range: string, latest: string): boolean {
  return Number(latest.split(".")[0]) > rangeMajor(range);
}
