import { describe, it, expect } from "vitest";
import type {
  TakoSearchResult,
  TakoAnswerResult,
  TakoContentsResult,
  TakoCard,
  TakoWebResult,
  TakoContentItem,
  TakoRetrievalConfig,
  TakoContentsConfig,
} from "../src/types";

describe("types", () => {
  it("models a search result", () => {
    const card: TakoCard = {
      card_id: "c1",
      title: "Nvidia vs AMD",
      semantic_description: "headcount",
      relevance: "High",
      source_indexes: ["tako", { index_type: "connected_data", segment_id: "123" }],
      sources: [{ source_name: "S&P", source_description: null, source_index: "tako", url: null }],
      methodologies: [{ methodology_name: "m", methodology_description: null }],
      content: { format: "csv", cost: 0 },
    };
    const web: TakoWebResult = { title: "W", url: "https://e.com", citation_number: 1 };
    const res: TakoSearchResult = { cards: [card], web_results: [web], contents_total_cost: 0, request_id: "r" };
    expect(res.cards[0].card_id).toBe("c1");
  });

  it("models an answer result", () => {
    const res: TakoAnswerResult = { answer: "A", cards: [], web_results: [], contents_total_cost: 0, request_id: "r" };
    expect(res.answer).toBe("A");
  });

  it("models a contents result", () => {
    const item: TakoContentItem = {
      source_url: "https://tako.com/card/x",
      url: "https://signed",
      expires_at: "2026-01-01T00:00:00Z",
      format: "csv",
      cost: 0,
      total_rows: 5,
      truncated: false,
    };
    const res: TakoContentsResult = { contents: [item], request_id: "r" };
    expect(res.contents[0].format).toBe("csv");
  });

  it("accepts retrieval + contents config", () => {
    const r: TakoRetrievalConfig = {
      apiKey: "k",
      baseUrl: "https://staging.trytako.com",
      effort: "deep",
      sources: { tako: { count: 10, deferDataRetrieval: true }, web: { count: 3, includeContents: true } },
      countryCode: "US",
      locale: "en-US",
      timezone: "America/New_York",
      outputSettings: { imageDarkMode: true, forceRefresh: false },
    };
    const c: TakoContentsConfig = { apiKey: "k", mode: "inline" };
    expect(r.effort).toBe("deep");
    expect(c.mode).toBe("inline");
  });
});
