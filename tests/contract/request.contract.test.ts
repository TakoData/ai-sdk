import { describe, expect, it } from "vitest";
import {
  buildContentsRequestBody,
  buildDataSourceSettings,
  buildGeoLocation,
  buildSearchRequestBody,
  buildWebSourceSettings,
} from "../../src/request";
import { check, propertiesOf, spec } from "./spec";

/**
 * Request-side contract: every body this SDK sends must validate against Tako's
 * published request schemas.
 *
 * `SearchRequest` and its nested `Sources` / `DataSourceSettings` /
 * `WebSourceSettings` / `OutputSettings` declare `additionalProperties: false`,
 * so the API rejects an unknown property with a 400 rather than ignoring it —
 * verified live, see the P0-1 case below.
 *
 * `ContentsRequest` is the one request schema that does NOT declare it, so
 * unknown properties pass validation there. The contents cases below therefore
 * gate field *shape*, not extras.
 */
describe("POST /v3/search — request body contract", () => {
  it("sends a spec-valid body for the default config", () => {
    const { valid, errors } = check("SearchRequest", buildSearchRequestBody({}, "q"));
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it("sends a spec-valid body for every documented config field", () => {
    const body = buildSearchRequestBody(
      {
        effort: "deep",
        countryCode: "GB",
        locale: "en-GB",
        timezone: "Europe/London",
        sources: { data: { count: 10, includeContents: true }, web: { count: 3 } },
        outputSettings: { imageDarkMode: true, forceRefresh: false },
      },
      "q",
    );
    const { valid, errors } = check("SearchRequest", body);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  // ---- P0-1: deferDataRetrieval is a field the API removed ----

  it("DataSourceSettings does not accept defer_data_retrieval", () => {
    // Guards the spec fact the bug depends on, so this test explains itself
    // if Tako ever reintroduces the field.
    expect(propertiesOf("DataSourceSettings")).toEqual([
      "count",
      "include_contents",
      "mode",
      "content_format",
      "node_ids",
      "strict",
    ]);
  });

  it("never emits defer_data_retrieval, whichever source key is used", () => {
    // The config option is gone, so no caller can reach the field. This asserts
    // the request builder itself cannot emit it either — including via the
    // deprecated `tako` alias, which maps onto the same `data` wire key.
    for (const sources of [
      { data: { count: 10, includeContents: true } },
      { tako: { count: 10, includeContents: true } },
    ]) {
      const body = buildSearchRequestBody({ sources }, "q");
      expect(JSON.stringify(body)).not.toContain("defer");
      expect(check("SearchRequest", body).errors).toEqual([]);
    }
  });

  it("rejects defer_data_retrieval if it is ever reintroduced by hand", () => {
    // Pins the reason the option was removed: the API forbids unknown
    // properties, so smuggling one back in is a 400, not a no-op.
    const body = buildSearchRequestBody({ sources: { data: { count: 1 } } }, "q");
    const smuggled = {
      ...body,
      sources: { data: { ...body.sources!.data, defer_data_retrieval: true } },
    };
    expect(check("SearchRequest", smuggled).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/sources/data",
          keyword: "additionalProperties",
          params: { additionalProperty: "defer_data_retrieval" },
        }),
      ]),
    );
  });
});

/**
 * Request-side contract for POST /v1/contents, built through the same helper the
 * tool uses (`buildContentsRequestBody`), so a change to the body shape breaks
 * these cases rather than sliding past a hand-written copy.
 */
describe("POST /v1/contents — request body contract", () => {
  it("sends a spec-valid body in both delivery modes", () => {
    for (const mode of ["url", "inline"] as const) {
      const body = buildContentsRequestBody("https://tako.com/card/abc123", { mode });
      expect(check("ContentsRequest", body).errors).toEqual([]);
      expect(body.mode).toBe(mode);
    }
  });

  it("maps every documented contents option to its wire name", () => {
    const body = buildContentsRequestBody("https://tako.com/card/abc123", {
      mode: "inline",
      contentFormat: "json_records",
      maxRows: 100,
      maxChars: 5000,
      quoteOnly: true,
    });
    expect(body).toEqual({
      url: "https://tako.com/card/abc123",
      mode: "inline",
      content_format: "json_records",
      max_rows: 100,
      max_chars: 5000,
      quote_only: true,
    });
    expect(check("ContentsRequest", body).errors).toEqual([]);
    expect(Object.keys(body).sort()).toEqual(propertiesOf("ContentsRequest").sort());
  });

  it("emits only properties the schema defines", () => {
    // ContentsRequest does not set additionalProperties: false, so ajv cannot
    // catch an extra field here. Assert it directly instead, so this surface is
    // still gated the way the search surface is by the schema itself.
    const allowed = propertiesOf("ContentsRequest");
    const body = buildContentsRequestBody("https://tako.com/card/abc123", { mode: "inline" });
    expect(Object.keys(body).filter((k) => !allowed.includes(k))).toEqual([]);
  });

  it("pins that ContentsRequest is the lone schema without additionalProperties:false", () => {
    // Documents the asymmetry the comment above relies on. If Tako tightens this
    // schema, this test fails and the comment (plus spec.ts) should be updated.
    const forbidsExtras = (name: string) =>
      spec.components.schemas[name].additionalProperties === false;
    for (const name of [
      "SearchRequest",
      "Sources",
      "DataSourceSettings",
      "WebSourceSettings",
      "OutputSettings",
      "GeoLocation",
    ]) {
      expect(forbidsExtras(name), `${name} should forbid extras`).toBe(true);
    }
    expect(forbidsExtras("ContentsRequest")).toBe(false);
  });
});

describe("WebSourceSettings — section contract", () => {
  it("maps every documented option to its wire name", () => {
    const body = buildWebSourceSettings({
      count: 3,
      includeContents: true,
      category: "news",
      includeDomains: ["sec.gov"],
      excludeDomains: ["example.com"],
      snippetMaxChars: 500,
      articleContentMaxChars: 20000,
      publishedAfter: "2026-01-01",
      publishedBefore: "2026-08-01",
    });
    expect(body).toEqual({
      count: 3,
      include_contents: true,
      category: "news",
      include_domains: ["sec.gov"],
      exclude_domains: ["example.com"],
      snippet_max_chars: 500,
      article_content_max_chars: 20000,
      published_after: "2026-01-01",
      published_before: "2026-08-01",
    });
    expect(check("WebSourceSettings", body).errors).toEqual([]);
  });

  it("omits absent options rather than sending nulls", () => {
    // The schema forbids unknown properties and applies its own defaults, so an
    // unset option must not appear at all.
    expect(buildWebSourceSettings({})).toEqual({});
    expect(check("WebSourceSettings", {}).errors).toEqual([]);
  });

  it("covers every property the schema defines", () => {
    // Fails when Tako adds a web option, which is the signal to expose it.
    const body = buildWebSourceSettings({
      count: 1, includeContents: true, category: "news",
      includeDomains: [], excludeDomains: [], snippetMaxChars: 1,
      articleContentMaxChars: 1, publishedAfter: "2026-01-01",
      publishedBefore: "2026-01-02",
    });
    expect(Object.keys(body).sort()).toEqual(propertiesOf("WebSourceSettings").sort());
  });
});

describe("DataSourceSettings — section contract", () => {
  it("maps every documented option to its wire name", () => {
    const body = buildDataSourceSettings({
      count: 10,
      includeContents: true,
      mode: "inline",
      contentFormat: "json_records",
      nodeIds: ["mt::revenue::abc123"],
      strict: true,
    });
    expect(body).toEqual({
      count: 10,
      include_contents: true,
      mode: "inline",
      content_format: "json_records",
      node_ids: ["mt::revenue::abc123"],
      strict: true,
    });
    expect(check("DataSourceSettings", body).errors).toEqual([]);
  });

  it("omits absent options rather than sending nulls", () => {
    expect(buildDataSourceSettings({})).toEqual({});
    expect(check("DataSourceSettings", {}).errors).toEqual([]);
  });

  it("covers every property the schema defines", () => {
    const body = buildDataSourceSettings({
      count: 1, includeContents: true, mode: "inline",
      contentFormat: "csv", nodeIds: ["a"], strict: true,
    });
    expect(Object.keys(body).sort()).toEqual(propertiesOf("DataSourceSettings").sort());
  });

  // The one local guard. strict without node_ids can never match a card, so the
  // request is guaranteed useless — and it is billed. Fail before the call.
  it("rejects strict without nodeIds, and names the fix", () => {
    expect(() => buildDataSourceSettings({ strict: true })).toThrow(
      /strict requires a non-empty nodeIds/,
    );
    expect(() => buildDataSourceSettings({ strict: true, nodeIds: [] })).toThrow(
      /strict requires a non-empty nodeIds/,
    );
  });

  it("allows strict false with no nodeIds", () => {
    expect(() => buildDataSourceSettings({ strict: false })).not.toThrow();
  });
});

describe("GeoLocation — section contract", () => {
  it("maps coordinates and validates against the schema", () => {
    const body = buildGeoLocation({ latitude: 37.77, longitude: -122.42 });
    expect(body).toEqual({ latitude: 37.77, longitude: -122.42 });
    expect(check("GeoLocation", body).errors).toEqual([]);
    expect(Object.keys(body).sort()).toEqual(propertiesOf("GeoLocation").sort());
  });
});

describe("SearchRequest — every documented option", () => {
  it("builds a spec-valid body with all 12 search-side options set", () => {
    const body = buildSearchRequestBody(
      {
        effort: "deep",
        countryCode: "GB",
        locale: "en-GB",
        timezone: "Europe/London",
        location: { latitude: 51.5, longitude: -0.12 },
        sources: {
          data: {
            count: 10, includeContents: true, mode: "inline",
            contentFormat: "json_compact", nodeIds: ["mt::revenue::abc"], strict: true,
          },
          web: {
            count: 3, includeContents: true, category: "news",
            includeDomains: ["sec.gov"], excludeDomains: ["example.com"],
            snippetMaxChars: 500, articleContentMaxChars: 20000,
            publishedAfter: "2026-01-01", publishedBefore: "2026-08-01",
          },
        },
        outputSettings: { imageDarkMode: true, forceRefresh: false },
      },
      "q",
    );
    expect(check("SearchRequest", body).errors).toEqual([]);
    expect(Object.keys(body).sort()).toEqual(propertiesOf("SearchRequest").sort());
  });

  it("routes the deprecated tako alias through the data builder", () => {
    const body = buildSearchRequestBody(
      { sources: { tako: { contentFormat: "csv", nodeIds: ["a"], strict: true } } },
      "q",
    );
    expect(body.sources?.data?.content_format).toBe("csv");
    expect(body.sources?.data?.strict).toBe(true);
    expect(check("SearchRequest", body).errors).toEqual([]);
  });
});
