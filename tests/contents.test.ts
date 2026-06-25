import { describe, it, expect, afterEach, vi } from "vitest";
import { takoContents } from "../src/tools/contents";
import { stubFetch, runTool } from "./_helpers";

const OK = JSON.stringify({
  contents: [{ source_url: "https://tako.com/card/x", url: "https://signed", expires_at: "2026-01-01T00:00:00Z", format: "csv", cost: 0, truncated: false }],
  request_id: "r",
});

afterEach(() => vi.unstubAllGlobals());

describe("takoContents", () => {
  it("posts to /api/v1/contents in url mode by default", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoContents({ apiKey: "key" });
    const res = await runTool(t, { url: "https://tako.com/card/x" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://trytako.com/api/v1/contents");
    expect(JSON.parse(init.body as string)).toEqual({ url: "https://tako.com/card/x", mode: "url" });
    expect((res as any).contents[0].format).toBe("csv");
  });

  it("uses inline mode when configured", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoContents({ apiKey: "key", mode: "inline" });
    await runTool(t, { url: "https://example.com/article" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      url: "https://example.com/article",
      mode: "inline",
    });
  });
});
