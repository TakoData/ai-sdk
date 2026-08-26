import { describe, expect, it } from "vitest";
import { isLagging } from "../scripts/sdk-lag";

describe("isLagging", () => {
  it("is false while the published version satisfies the range", () => {
    expect(isLagging("^1.3.0", "1.9.2")).toBe(false);
    expect(isLagging("~2.0.1", "2.0.9")).toBe(false);
    expect(isLagging("*", "9.9.9")).toBe(false);
  });

  it("is true once npm publishes a version the range cannot reach", () => {
    expect(isLagging("^1.3.0", "2.0.0")).toBe(true);
    expect(isLagging("3.1.4", "3.1.5")).toBe(true);
  });

  // Each of these was wrong under the leading-major regex this replaced. A 0.x
  // caret is minor-locked, so 0.4.0 is out of reach of ^0.3.1 — the old code
  // compared majors, saw 0 against 0, and reported no lag.
  it("handles the ranges a leading-major read got wrong", () => {
    expect(isLagging("^0.3.1", "0.4.0")).toBe(true);
    expect(isLagging("~0.2.3", "0.3.0")).toBe(true);
    expect(isLagging("^0.0.3", "0.0.4")).toBe(true);
    expect(isLagging("1.3.0 || 2.0.0", "2.0.0")).toBe(false);
    expect(isLagging("<2.0.0", "2.0.0")).toBe(true);
  });

  it("rejects a range npm cannot parse", () => {
    expect(() => isLagging("workspace:*", "1.0.0")).toThrow(/cannot read a dependency range/);
  });
});
