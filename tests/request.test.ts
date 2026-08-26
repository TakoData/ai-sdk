import { describe, expect, expectTypeOf, it } from "vitest";
import {
  AnswerRequestToJSON,
  SearchRequestToJSON,
  type AnswerRequest,
  type ContentsRequest,
  type SearchRequest,
} from "tako-sdk";
import { buildAnswerRequestBody, buildContentsRequestBody, buildSearchRequestBody } from "../src/request";

// The builders do two things: drop this package's connection fields, and add
// the field the model supplies. Anything else — a rename, a default, a range
// check — would be a second copy of the API's contract, and the point of 4.0
// is that there is only one.

describe("request builders", () => {
  it("send only query when the config is empty", () => {
    const body = buildSearchRequestBody({}, "nvidia revenue");
    expectTypeOf(body).toEqualTypeOf<SearchRequest>();
    expect(body).toEqual({ query: "nvidia revenue" });
  });

  it("pass every config key through unchanged, and never apiKey or baseUrl", () => {
    const body = buildSearchRequestBody(
      {
        apiKey: "k",
        baseUrl: "https://e.com",
        effort: "deep",
        include_related: 2,
        sources: {
          data: { count: 10, max_rows: 50 },
          web: { highlights: true, published_after: new Date("2026-01-01") },
        },
      },
      "q",
    );
    expect(body).toEqual({
      query: "q",
      effort: "deep",
      include_related: 2,
      sources: {
        data: { count: 10, max_rows: 50 },
        web: { highlights: true, published_after: new Date("2026-01-01") },
      },
    });
    // The generated serializer writes the date as YYYY-MM-DD. A Date built with
    // the ISO-string constructor is UTC midnight, so it round-trips exactly.
    expect(SearchRequestToJSON(body).sources?.web?.published_after).toBe("2026-01-01");
  });

  it("give the answer builder output_schema", () => {
    const body = buildAnswerRequestBody({ apiKey: "k", effort: "deep", output_schema: { type: "object" } }, "q");
    expectTypeOf(body).toEqualTypeOf<AnswerRequest>();
    expect(body).toEqual({ query: "q", effort: "deep", output_schema: { type: "object" } });
    expect(AnswerRequestToJSON(body).output_schema).toEqual({ type: "object" });
  });

  it("send only url when the contents config is empty, leaving mode to the API", () => {
    const body = buildContentsRequestBody("https://tako.com/card/x", { apiKey: "k", baseUrl: "https://e.com" });
    expectTypeOf(body).toEqualTypeOf<ContentsRequest>();
    expect(body).toEqual({ url: "https://tako.com/card/x" });
  });

  it("pass contents options through", () => {
    const body = buildContentsRequestBody("https://tako.com/card/x", {
      mode: "inline",
      content_format: "csv",
      max_rows: 100,
      quote_only: true,
    });
    expect(body).toEqual({
      url: "https://tako.com/card/x",
      mode: "inline",
      content_format: "csv",
      max_rows: 100,
      quote_only: true,
    });
  });
});
