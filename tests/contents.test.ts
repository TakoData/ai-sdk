import { describe, it, expect, afterEach, vi } from "vitest";
import { takoContents } from "../src/tools/contents";
import { stubFetch, runTool } from "./_helpers";

const OK = JSON.stringify({
  contents: [
    {
      source_url: "https://tako.com/card/x",
      url: "https://signed",
      expires_at: "2026-01-01T00:00:00Z",
      content_format: "csv",
      cost: 0,
      truncated: false,
    },
  ],
  request_id: "r",
});

afterEach(() => vi.unstubAllGlobals());

describe("takoContents", () => {
  it("posts to /api/v1/contents in url mode by default", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoContents({ apiKey: "key" });
    const res = await runTool(t, { url: "https://tako.com/card/x" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://tako.com/api/v1/contents");
    expect(JSON.parse(init.body as string)).toEqual({ url: "https://tako.com/card/x", mode: "url" });
    expect((res as any).contents[0].content_format).toBe("csv");
  });

  it("rejects a non-url input before any request is made", () => {
    // The AI SDK validates inputSchema before calling execute, so a malformed
    // url costs nothing. Asserted on the schema directly, since runTool()
    // bypasses that layer.
    const schema = takoContents({ apiKey: "key" }).inputSchema as {
      safeParse: (v: unknown) => { success: boolean };
    };
    for (const url of ["https://tako.com/card/x", "https://e.com/a?b=1#c"]) {
      expect(schema.safeParse({ url }).success).toBe(true);
    }
    for (const url of ["not a url", "", "card/x"]) {
      expect(schema.safeParse({ url }).success).toBe(false);
    }
  });

  it("normalizes an absent contents collection to an empty array", async () => {
    stubFetch(200, JSON.stringify({ request_id: "r" }));
    const res = (await runTool(takoContents({ apiKey: "key" }), { url: "https://tako.com/card/x" })) as any;
    expect(res.contents).toEqual([]);
  });

  it("surfaces web text when content_format is absent entirely", async () => {
    // content_format is optional as well as nullable, so a web-text item may
    // omit the key rather than send null. Consumers must branch loosely.
    stubFetch(
      200,
      JSON.stringify({
        contents: [{ source_url: "https://e.com/a", data: "prose" }],
        request_id: "r",
      }),
    );
    const res = (await runTool(takoContents({ apiKey: "key", mode: "inline" }), {
      url: "https://e.com/a",
    })) as any;
    expect(res.contents[0].content_format).toBeUndefined();
    expect(res.contents[0].content_format == null).toBe(true);
    expect(res.contents[0].data).toBe("prose");
  });

  it("surfaces web text, which carries a null content_format", async () => {
    stubFetch(
      200,
      JSON.stringify({
        contents: [{ source_url: "https://e.com/a", content_format: null, data: "prose" }],
        request_id: "r",
      }),
    );
    const res = (await runTool(takoContents({ apiKey: "key", mode: "inline" }), {
      url: "https://e.com/a",
    })) as any;
    expect(res.contents[0].content_format).toBeNull();
    expect(res.contents[0].data).toBe("prose");
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
