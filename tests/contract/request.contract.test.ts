import { describe, expect, it } from "vitest";
import { buildContentsRequestBody, buildSearchRequestBody } from "../../src/request";
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
      const body = buildContentsRequestBody("https://tako.com/card/abc123", mode);
      expect(check("ContentsRequest", body).errors).toEqual([]);
      expect(body.mode).toBe(mode);
    }
  });

  it("emits only properties the schema defines", () => {
    // ContentsRequest does not set additionalProperties: false, so ajv cannot
    // catch an extra field here. Assert it directly instead, so this surface is
    // still gated the way the search surface is by the schema itself.
    const allowed = propertiesOf("ContentsRequest");
    const body = buildContentsRequestBody("https://tako.com/card/abc123", "inline");
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
