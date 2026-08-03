import { describe, expect, it } from "vitest";
import { buildSearchRequestBody } from "../../src/request";
import { check, propertiesOf } from "./spec";

/**
 * Request-side contract: every body this SDK sends must validate against Tako's
 * published request schemas.
 *
 * Both `SearchRequest` and its nested `DataSourceSettings` / `WebSourceSettings`
 * declare `additionalProperties: false`. That is the OpenAPI projection of the
 * server's Pydantic `extra="forbid"`, so a property the schema rejects is a
 * property the API rejects — a 400, not a silently-ignored field.
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
 * Request-side contract for POST /v1/contents. The tool builds this body inline
 * (src/tools/contents.ts) rather than through a helper, so it is reproduced here.
 */
describe("POST /v1/contents — request body contract", () => {
  it("sends a spec-valid body in url mode", () => {
    const { errors } = check("ContentsRequest", {
      url: "https://tako.com/card/abc123",
      mode: "url",
    });
    expect(errors).toEqual([]);
  });

  it("sends a spec-valid body in inline mode", () => {
    const { errors } = check("ContentsRequest", {
      url: "https://tako.com/card/abc123",
      mode: "inline",
    });
    expect(errors).toEqual([]);
  });
});
