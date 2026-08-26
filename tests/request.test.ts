import { describe, expect, expectTypeOf, it } from "vitest";
import {
  ContentsRequestToJSON,
  DataSourceSettingsToJSON,
  OutputSettingsToJSON,
  SearchRequestToJSON,
  WebSourceSettingsToJSON,
  type SearchRequest,
  type WebSourceSettings,
} from "tako-sdk";
import {
  buildContentsRequestBody,
  buildDataSourceSettings,
  buildOutputSettings,
  buildSearchRequestBody,
  buildWebSourceSettings,
} from "../src/request";

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

  // `new Date("2026-02-31")` does not fail, it rolls forward to 2026-03-03.
  // Without the round-trip check the request filters from a date the caller
  // never wrote, and nothing anywhere says so.
  it("rejects a well-formed date that is not on the calendar", () => {
    for (const bad of ["2026-02-31", "2026-02-30", "2026-04-31"]) {
      expect(() => buildWebSourceSettings({ publishedBefore: bad })).toThrow(
        /publishedBefore is not a real calendar date/,
      );
    }
    expect(buildWebSourceSettings({ publishedBefore: "2028-02-29" }).published_before).toBeInstanceOf(Date);
  });
});

// A generated `*ToJSON` returns an object literal holding every key its model
// declares, so the request schema is enumerable at run time and needs no
// vendored spec. This is what catches a Tako option this package never exposed:
// `tako-sdk` regenerates, a name appears here that no builder writes, and the
// bump's own PR goes red instead of the option going unnoticed. The replaced
// contract suite read a pinned `openapi.yaml`, so it could only ever fail on a
// regression in this repo, never on a change Tako shipped.
const SECTIONS = [
  {
    name: "WebSourceSettings",
    declared: Object.keys(WebSourceSettingsToJSON({})),
    built: buildWebSourceSettings({
      count: 1,
      includeContents: true,
      category: "news",
      includeDomains: ["a.com"],
      excludeDomains: ["b.com"],
      snippetMaxChars: 1,
      articleContentMaxChars: 1,
      publishedAfter: "2026-01-01",
      publishedBefore: "2026-01-02",
    }) as Record<string, unknown>,
  },
  {
    name: "DataSourceSettings",
    declared: Object.keys(DataSourceSettingsToJSON({})),
    built: buildDataSourceSettings({
      count: 1,
      includeContents: true,
      mode: "inline",
      contentFormat: "csv",
      nodeIds: ["ent::x"],
      strict: true,
    }) as Record<string, unknown>,
  },
  {
    name: "OutputSettings",
    declared: Object.keys(OutputSettingsToJSON({})),
    built: buildOutputSettings({ imageDarkMode: true, forceRefresh: true }) as Record<string, unknown>,
  },
  {
    name: "SearchRequest",
    declared: Object.keys(SearchRequestToJSON({ query: "q" })),
    built: buildSearchRequestBody(
      {
        effort: "deep",
        countryCode: "US",
        locale: "en-US",
        timezone: "UTC",
        location: { latitude: 1, longitude: 2 },
        sources: { web: {} },
        outputSettings: { forceRefresh: true },
      },
      "q",
    ) as unknown as Record<string, unknown>,
  },
  {
    name: "ContentsRequest",
    declared: Object.keys(ContentsRequestToJSON({ url: "https://tako.com/card/x", mode: "url" })),
    built: buildContentsRequestBody("https://tako.com/card/x", {
      mode: "inline",
      contentFormat: "csv",
      maxRows: 1,
      maxChars: 1,
      quoteOnly: true,
    }) as unknown as Record<string, unknown>,
  },
];

// Options `tako-sdk` declares that this package has not exposed yet. A name
// here is a deliberate deferral, not an exemption: the test asserts the gap set
// EQUALS this list, so a newly declared option fails until someone either
// exposes it or records it here on purpose.
//
// `include_related` is the one worth reading twice. `SearchResponse.related`
// already decodes, so a caller can read related cards but cannot ask for them.
const NOT_EXPOSED: Record<string, string[]> = {
  WebSourceSettings: ["highlights"],
  DataSourceSettings: ["max_rows"],
  SearchRequest: ["include_related"],
};

describe("request builders cover the generated request schema", () => {
  it.each(SECTIONS)("$name exposes every option tako-sdk declares", ({ name, declared, built }) => {
    const gaps = declared.filter((key) => !(key in built));
    expect(gaps.sort()).toEqual([...(NOT_EXPOSED[name] ?? [])].sort());
  });
});
