import { describe, it, expect, afterEach, vi } from "vitest";
import { takoAnswer } from "../src/tools/answer";
import { stubFetch, runTool } from "./_helpers";

const OK = JSON.stringify({ answer: "AMD grew faster.", cards: [], web_results: [], contents_total_cost: 0, request_id: "r" });

afterEach(() => vi.unstubAllGlobals());

describe("takoAnswer", () => {
  it("posts to /api/v1/answer and returns the synthesized answer", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoAnswer({ apiKey: "key" });
    const res = await runTool(t, { query: "did AMD or Nvidia grow headcount faster?" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://trytako.com/api/v1/answer");
    expect(JSON.parse(init.body as string)).toEqual({
      query: "did AMD or Nvidia grow headcount faster?",
      effort: "fast",
      country_code: "US",
      locale: "en-US",
    });
    expect((res as any).answer).toBe("AMD grew faster.");
  });
});
