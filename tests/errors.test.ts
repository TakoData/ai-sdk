import { describe, expect, it } from "vitest";
import { FetchError, ResponseError } from "tako-sdk";
import { wrapTakoError } from "../src/errors";

describe("wrapTakoError", () => {
  it("turns a ResponseError into the status + body message", async () => {
    const res = new Response("unauthorized", { status: 401 });
    const err = await wrapTakoError(new ResponseError(res, "Response returned an error code"), "search");
    expect(err.message).toBe("Failed to search with Tako: Tako API error: 401 - unauthorized");
  });

  it("surfaces the underlying cause of a FetchError", async () => {
    const err = await wrapTakoError(new FetchError(new TypeError("ECONNRESET"), "The request failed"), "answer");
    expect(err.message).toBe("Failed to answer with Tako: ECONNRESET");
  });

  it("wraps any other Error with the operation", async () => {
    const err = await wrapTakoError(new Error("boom"), "fetch contents");
    expect(err.message).toBe("Failed to fetch contents with Tako: boom");
  });

  it("stringifies a non-Error throw", async () => {
    const err = await wrapTakoError("nope", "search");
    expect(err.message).toBe("Failed to search with Tako: nope");
  });
});
