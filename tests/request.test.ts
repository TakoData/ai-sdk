import { describe, expect, expectTypeOf, it } from "vitest";
import { SearchRequestToJSON, type SearchRequest, type WebSourceSettings } from "tako-sdk";
import { buildSearchRequestBody, buildWebSourceSettings } from "../src/request";

describe("request builders produce tako-sdk request types", () => {
  it("returns the generated SearchRequest type with only the keys the caller set", () => {
    const body = buildSearchRequestBody({}, "nvidia revenue");
    expectTypeOf(body).toEqualTypeOf<SearchRequest>();
    expect(Object.keys(body)).toEqual(["query"]);
  });

  it("converts ISO date strings to Date for the generated date fields, and back on the wire", () => {
    const web: WebSourceSettings = buildWebSourceSettings({ publishedAfter: "2026-01-01", publishedBefore: "2026-12-31" });
    expect(web.published_after).toBeInstanceOf(Date);
    const wire = SearchRequestToJSON(buildSearchRequestBody({ sources: { web: { publishedAfter: "2026-01-01" } } }, "q"));
    expect(wire.sources?.web?.published_after).toBe("2026-01-01");
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    expect(() => buildWebSourceSettings({ publishedAfter: "yesterday" })).toThrow(
      /publishedAfter must be an ISO date "YYYY-MM-DD"/,
    );
  });
});
