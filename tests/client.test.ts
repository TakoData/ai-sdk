import { describe, it, expect, afterEach, vi } from "vitest";
import { callTako } from "../src/client";
import { stubFetch } from "./_helpers";

afterEach(() => vi.unstubAllGlobals());

describe("callTako", () => {
  it("posts JSON with X-API-Key and returns the parsed body", async () => {
    const fetchMock = stubFetch(200, JSON.stringify({ ok: true }));
    const res = await callTako<{ ok: boolean }>({
      baseUrl: "https://trytako.com",
      path: "/api/v3/search",
      apiKey: "key",
      body: { query: "x" },
      operation: "search",
    });
    expect(res).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://trytako.com/api/v3/search");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ query: "x" }));
  });

  it("throws a clear error when apiKey is missing (before fetching)", async () => {
    const fetchMock = stubFetch(200, "{}");
    await expect(
      callTako({ baseUrl: "https://trytako.com", path: "/x", apiKey: undefined, body: {}, operation: "search" }),
    ).rejects.toThrow(/TAKO_API_KEY is required/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wraps a non-2xx response with status and body text", async () => {
    stubFetch(401, "unauthorized", "text/plain");
    await expect(
      callTako({ baseUrl: "https://trytako.com", path: "/x", apiKey: "k", body: {}, operation: "search" }),
    ).rejects.toThrow(/Failed to search with Tako: Tako API error: 401 - unauthorized/);
  });
});
