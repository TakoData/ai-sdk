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
    });
    expect((res as any).answer).toBe("AMD grew faster.");
  });

  // Constructing the tool must throw, not calling it. An `execute` error goes to
  // the model, which can change neither field, so it would retry the same
  // guaranteed 400 until the step limit.
  it("throws when output_schema meets instant effort, at construction and before any fetch", () => {
    const fetchMock = stubFetch(200, OK);
    expect(() => takoAnswer({ apiKey: "key", effort: "instant", output_schema: { type: "object" } })).toThrow(
      /output_schema requires effort "fast" or "deep"/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds normally with output_schema on the efforts that support it", () => {
    for (const effort of ["fast", "deep"] as const) {
      expect(() => takoAnswer({ apiKey: "key", effort, output_schema: { type: "object" } })).not.toThrow();
    }
    // Instant without a schema is fine; only the pair is a contradiction.
    expect(() => takoAnswer({ apiKey: "key", effort: "instant" })).not.toThrow();
  });

  it("mentions structured_output in the description only when output_schema is set", () => {
    expect(takoAnswer({ apiKey: "key" }).description).not.toMatch(/structured_output/);
    expect(takoAnswer({ apiKey: "key", output_schema: { type: "object" } }).description).toMatch(
      /structured_output/,
    );
  });

  it("sends output_schema and returns structured_output", async () => {
    const fetchMock = stubFetch(
      200,
      JSON.stringify({ answer: "x", request_id: "r", structured_output: { revenue_usd: 1 } }),
    );
    const t = takoAnswer({
      apiKey: "key",
      output_schema: { type: "object", properties: { revenue_usd: { type: "number" } } },
    });
    const res = (await runTool(t, { query: "nvidia revenue" })) as any;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).output_schema).toEqual({
      type: "object",
      properties: { revenue_usd: { type: "number" } },
    });
    expect(res.structured_output).toEqual({ revenue_usd: 1 });
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
