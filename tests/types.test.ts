import { describe, it, expect } from "vitest";
import type {
  TakoSearchResult,
  TakoAnswerResult,
  TakoContentsResult,
  TakoCard,
  TakoCardSource,
  TakoWebResult,
  TakoContentItem,
  TakoRetrievalConfig,
  TakoContentsConfig,
  TakoUsage,
} from "../src/types";

describe("types", () => {
  it("models a search result", () => {
    const card: TakoCard = {
      card_id: "c1",
      title: "Nvidia vs AMD",
      semantic_description: "headcount",
      relevance: "High",
      relevance_score: 4.5,
      exportable: true,
      source_indexes: ["data", "web"],
      sources: [{ source_name: "S&P", source_description: null, source_index: "data", url: null }],
      methodologies: [{ methodology_name: "m", methodology_description: null }],
      nodes: [{ id: "ent::nvidia::ab12", type: "entity", name: "Nvidia" }],
      metric_definitions: [{ name: "Full Time Employees", definition: "Headcount at fiscal year end." }],
      data_freshness: { data_as_of: "2026-01-31", last_updated: "2026-02-14" },
      content: { content_format: "csv", cost: 0 },
    };
    const web: TakoWebResult = { title: "W", url: "https://e.com", citation_number: 1 };
    const usage: TakoUsage = { total_cost_usd: 0.02, compute: { cost_usd: 0.02 } };
    const res: TakoSearchResult = { cards: [card], web_results: [web], request_id: "r", usage };
    expect(res.cards[0].card_id).toBe("c1");
    expect(res.usage?.total_cost_usd).toBe(0.02);
  });

  it("models a card source over the {data, web} taxonomy", () => {
    const sources: TakoCardSource[] = [
      { source_name: "S&P", source_index: "data" },
      { source_name: "Reuters", source_index: "web", source_text: "raw excerpt" },
    ];
    expect(sources.map((s) => s.source_index)).toEqual(["data", "web"]);
  });

  it("models an answer result", () => {
    const res: TakoAnswerResult = { answer: "A", cards: [], web_results: [], request_id: "r" };
    expect(res.answer).toBe("A");
  });

  it("models a contents result in url mode", () => {
    const item: TakoContentItem = {
      source_url: "https://tako.com/card/x",
      url: "https://signed",
      expires_at: "2026-01-01T00:00:00Z",
      content_format: "csv",
      cost: 0,
      total_rows: 5,
      truncated: false,
      export_pricing: { baseline_usd: 0.01, row_cpm_usd: 0.5, free_rows: 20, max_rows_ceiling: 2000 },
    };
    const res: TakoContentsResult = { contents: [item], request_id: "r" };
    expect(res.contents[0].content_format).toBe("csv");
  });

  it("models the json_compact dataset payload", () => {
    const item: TakoContentItem = {
      source_url: "https://tako.com/card/x",
      content_format: "json_compact",
      dataset: {
        columns: [
          { name: "year", type: "date" },
          { name: "employees", type: "number", unit: "count" },
        ],
        rows: [
          ["2024-01-31", 29600],
          ["2025-01-31", 36000],
        ],
        total_rows: 2,
        truncated: false,
        ref: "https://tako.com/card/x",
        sources: [{ name: "S&P Global", index: "data" }],
        provenance: "query",
      },
    };
    expect(item.dataset?.rows[1][1]).toBe(36000);
  });

  it("models web page text, which carries no content_format", () => {
    // The field is optional as well as nullable: web text arrives as either an
    // explicit null or an absent key, so both must typecheck and both must be
    // caught by a loose `== null` test.
    const explicitNull: TakoContentItem = {
      source_url: "https://e.com/article",
      content_format: null,
      data: "extracted prose",
    };
    const absent: TakoContentItem = {
      source_url: "https://e.com/article",
      data: "extracted prose",
    };
    expect(explicitNull.content_format).toBeNull();
    expect(absent.content_format).toBeUndefined();
    for (const item of [explicitNull, absent]) {
      expect(item.content_format == null).toBe(true);
      expect(item.data).toBe("extracted prose");
    }
  });

  it("accepts retrieval + contents config", () => {
    const r: TakoRetrievalConfig = {
      apiKey: "k",
      baseUrl: "https://staging.tako.com",
      effort: "deep",
      sources: { data: { count: 10, includeContents: true }, web: { count: 3, includeContents: true } },
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
