import { describe, it, expect, afterEach, vi } from "vitest";
import { takoSearch, takoAnswer, takoContents } from "../src/index";
import { stubFetch, runTool } from "./_helpers";

afterEach(() => vi.unstubAllGlobals());

describe("index barrel", () => {
  it("exports all three tool factories", () => {
    expect(typeof takoSearch).toBe("function");
    expect(typeof takoAnswer).toBe("function");
    expect(typeof takoContents).toBe("function");
  });

  it("the exported takoSearch produces a working tool", async () => {
    stubFetch(200, JSON.stringify({ cards: [], web_results: [], contents_total_cost: 0, request_id: "r" }));
    const res = await runTool(takoSearch({ apiKey: "key" }), { query: "x" });
    expect((res as any).request_id).toBe("r");
  });
});
