import { describe, it, expect, afterEach, vi } from "vitest";
import { takoAnswer } from "../src/tools/answer";
import { stubFetch, runTool } from "./_helpers";

const OK = JSON.stringify({ answer: "AMD grew faster.", cards: [], web_results: [], request_id: "r" });

afterEach(() => vi.unstubAllGlobals());

describe("takoAnswer", () => {
  it("posts to /api/v1/answer and returns the synthesized answer", async () => {
    const fetchMock = stubFetch(200, OK);
    const t = takoAnswer({ apiKey: "key" });
    const res = await runTool(t, { query: "did AMD or Nvidia grow headcount faster?" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://tako.com/api/v1/answer");
    expect(JSON.parse(init.body as string)).toEqual({
      query: "did AMD or Nvidia grow headcount faster?",
      effort: "fast",
      country_code: "US",
      locale: "en-US",
    });
    expect((res as any).answer).toBe("AMD grew faster.");
  });

  it("normalizes absent collections to empty arrays", async () => {
    // The contract guarantees only `answer` and `request_id` here, so a bare
    // response is valid. Callers still get arrays they can read without a guard.
    stubFetch(200, JSON.stringify({ answer: "x", request_id: "r" }));
    const res = (await runTool(takoAnswer({ apiKey: "key" }), { query: "q" })) as any;
    expect(res.cards).toEqual([]);
    expect(res.web_results).toEqual([]);
    expect(res.answer).toBe("x");
  });
});
