import { describe, it, expect, afterEach, vi } from "vitest";
import { takoSearch } from "../src/tools/search";
import { stubFetch, runTool } from "./_helpers";

const OK = JSON.stringify({ cards: [], web_results: [], request_id: "r" });

afterEach(() => vi.unstubAllGlobals());

describe("takoSearch", () => {
  it("posts to /api/v3/search with defaults (query only)", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoSearch({ apiKey: "key" });
    const res = await runTool(t, { query: "nvidia revenue" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://tako.com/api/v3/search");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("key");
    // Only `query` is sent. The three server defaults this SDK used to restate
    // are gone, so Tako applies its own.
    expect(JSON.parse(init.body as string)).toEqual({ query: "nvidia revenue" });
    expect((res as any).request_id).toBe("r");
  });

  it("sends the config keys as given and omits absent sources", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoSearch({
      apiKey: "key",
      effort: "deep",
      sources: { data: { count: 10, include_contents: true } },
      timezone: "America/New_York",
      output_settings: { image_dark_mode: true },
    });
    await runTool(t, { query: "x" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      query: "x",
      effort: "deep",
      sources: { data: { count: 10, include_contents: true } },
      timezone: "America/New_York",
      output_settings: { image_dark_mode: true },
    });
  });

  it("normalizes absent collections to empty arrays", async () => {
    // The API guarantees only request_id, so a valid response can omit both
    // collections. Callers still get arrays they can read without a guard.
    stubFetch(200, JSON.stringify({ request_id: "r" }));
    const res = (await runTool(takoSearch({ apiKey: "key" }), { query: "x" })) as any;
    expect(res.cards).toEqual([]);
    expect(res.web_results).toEqual([]);
    expect(res.request_id).toBe("r");
  });

  it("passes usage through untouched", async () => {
    stubFetch(
      200,
      JSON.stringify({
        request_id: "r",
        usage: { total_cost_usd: 0.03, compute: { cost_usd: 0.01 }, data: { cost_usd: 0.02, datasets: 2 } },
      }),
    );
    const res = (await runTool(takoSearch({ apiKey: "key" }), { query: "x" })) as any;
    expect(res.usage).toEqual({
      total_cost_usd: 0.03,
      compute: { cost_usd: 0.01 },
      data: { cost_usd: 0.02, datasets: 2 },
    });
  });

  it("honors baseUrl override (trailing slash stripped)", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoSearch({ apiKey: "key", baseUrl: "https://e.com/" });
    await runTool(t, { query: "x" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://e.com/api/v3/search");
  });

  it("sends web filters and the options 4.0 could not reach", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoSearch({
      apiKey: "key",
      include_related: 2,
      sources: {
        data: { max_rows: 50 },
        web: { include_domains: ["sec.gov"], highlights: true, published_after: new Date("2026-01-01") },
      },
    });
    await runTool(t, { query: "x" });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.include_related).toBe(2);
    expect(body.sources.data.max_rows).toBe(50);
    expect(body.sources.web.include_domains).toEqual(["sec.gov"]);
    expect(body.sources.web.highlights).toBe(true);
    expect(body.sources.web.published_after).toBe("2026-01-01");
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
