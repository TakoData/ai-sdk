import { describe, it, expect, afterEach, vi } from "vitest";
import { takoSearch } from "../src/tools/search";
import { stubFetch, runTool } from "./_helpers";

const OK = JSON.stringify({ cards: [], web_results: [], contents_total_cost: 0, request_id: "r" });

afterEach(() => vi.unstubAllGlobals());

describe("takoSearch", () => {
  it("posts to /api/v3/search with defaults (query only)", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoSearch({ apiKey: "key" });
    const res = await runTool(t, { query: "nvidia revenue" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://trytako.com/api/v3/search");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("key");
    expect(JSON.parse(init.body as string)).toEqual({
      query: "nvidia revenue",
      effort: "fast",
      country_code: "US",
      locale: "en-US",
    });
    expect((res as any).request_id).toBe("r");
  });

  it("maps source + output overrides to snake_case and omits absent sources", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoSearch({
      apiKey: "key",
      effort: "deep",
      sources: { tako: { count: 10, deferDataRetrieval: true } },
      timezone: "America/New_York",
      outputSettings: { imageDarkMode: true },
    });
    await runTool(t, { query: "x" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      query: "x",
      effort: "deep",
      country_code: "US",
      locale: "en-US",
      sources: { tako: { count: 10, defer_data_retrieval: true } },
      timezone: "America/New_York",
      output_settings: { image_dark_mode: true },
    });
  });

  it("honors baseUrl override (trailing slash stripped)", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoSearch({ apiKey: "key", baseUrl: "https://staging.trytako.com/" });
    await runTool(t, { query: "x" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://staging.trytako.com/api/v3/search");
  });

  it("falls back to TAKO_API_KEY env and throws clearly when unset", async () => {
    const saved = { k: process.env.TAKO_API_KEY, t: process.env.TAKO_API_TOKEN };
    delete process.env.TAKO_API_KEY;
    delete process.env.TAKO_API_TOKEN;
    try {
      stubFetch(200, OK);
      await expect(runTool(takoSearch({}), { query: "x" })).rejects.toThrow(/TAKO_API_KEY is required/);
    } finally {
      if (saved.k !== undefined) process.env.TAKO_API_KEY = saved.k;
      if (saved.t !== undefined) process.env.TAKO_API_TOKEN = saved.t;
    }
  });
});
