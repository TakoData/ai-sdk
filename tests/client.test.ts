import { afterEach, describe, expect, it, vi } from "vitest";
import { Tako } from "tako-sdk";
import { callTako, createTakoClient, lazyTakoClient } from "../src/client";
import { stubFetch } from "./_helpers";

afterEach(() => vi.unstubAllGlobals());

describe("createTakoClient", () => {
  it("builds a Tako facade against baseUrl + /api and sends X-API-Key", async () => {
    const fetchMock = stubFetch(200, JSON.stringify({ request_id: "r" }));
    const client = createTakoClient({ apiKey: "key", baseUrl: "https://e.com/" });
    expect(client).toBeInstanceOf(Tako);
    await client.search({ query: "x" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://e.com/api/v3/search");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("key");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ query: "x" });
  });

  it("stamps the ai_sdk caller channel on the request", async () => {
    const fetchMock = stubFetch(200, JSON.stringify({ request_id: "r" }));
    const client = createTakoClient({ apiKey: "key" });
    await client.search({ query: "US GDP growth rate" });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Tako-Caller"]).toMatch(/^channel=ai_sdk, client_version="\d+\.\d+\.\d+"$/);
  });

  it("throws before any request when no key resolves", () => {
    const saved = { k: process.env.TAKO_API_KEY, t: process.env.TAKO_API_TOKEN };
    delete process.env.TAKO_API_KEY;
    delete process.env.TAKO_API_TOKEN;
    try {
      const fetchMock = stubFetch(200, "{}");
      expect(() => createTakoClient({})).toThrow(/TAKO_API_KEY is required/);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (saved.k !== undefined) process.env.TAKO_API_KEY = saved.k;
      if (saved.t !== undefined) process.env.TAKO_API_TOKEN = saved.t;
    }
  });
});

describe("lazyTakoClient", () => {
  it("builds once and reuses", () => {
    const get = lazyTakoClient({ apiKey: "key" });
    expect(get()).toBe(get());
  });
});

describe("callTako", () => {
  it("wraps a non-2xx response with status and body text", async () => {
    stubFetch(401, "unauthorized", "text/plain");
    const client = createTakoClient({ apiKey: "k" });
    await expect(callTako("search", () => client.search({ query: "x" }))).rejects.toThrow(
      /Failed to search with Tako: Tako API error: 401 - unauthorized/,
    );
  });

  it("wraps a network failure with its cause", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("ECONNRESET"); }));
    const client = createTakoClient({ apiKey: "k" });
    await expect(callTako("answer", () => client.answer({ query: "x" }))).rejects.toThrow(
      /Failed to answer with Tako: ECONNRESET/,
    );
  });
});
