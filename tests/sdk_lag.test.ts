import { describe, expect, it } from "vitest";
import { isLagging, rangeMajor } from "../scripts/sdk-lag";

describe("rangeMajor", () => {
  it("reads the major from caret, tilde, exact and >= ranges", () => {
    expect(rangeMajor("^1.3.0")).toBe(1);
    expect(rangeMajor("~2.0.1")).toBe(2);
    expect(rangeMajor("3.1.4")).toBe(3);
    expect(rangeMajor(">=4.0.0")).toBe(4);
  });
  it("rejects a range it cannot read", () => {
    expect(() => rangeMajor("workspace:*")).toThrow(/cannot read a major/);
  });
});

describe("isLagging", () => {
  it("is false while the published major matches the range", () => {
    expect(isLagging("^1.3.0", "1.9.2")).toBe(false);
  });
  it("is true once npm publishes a major the range cannot reach", () => {
    expect(isLagging("^1.3.0", "2.0.0")).toBe(true);
  });
});
