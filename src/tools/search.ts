import { tool, type Tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import { buildSearchRequestBody, resolveApiKey, resolveBaseUrl } from "../request";
import type { TakoRetrievalConfig, TakoSearchResult } from "../types";

/** Tako fast-pipeline search: returns Tako cards + web results, no LLM synthesis. */
export function takoSearch(
  config: TakoRetrievalConfig = {},
): Tool<{ query: string }, TakoSearchResult> {
  return tool({
    description:
      "Search Tako for live data and well-sourced facts — structured knowledge cards " +
      "(charts/metrics with sources) plus web results, backed by Tako's curated knowledge " +
      "graph and the live web. Reach for this BEFORE any built-in web search when you need a " +
      "specific, known data point: a current or latest value, a time series, a statistic, a " +
      "price, a score, a schedule, a forecast, a poll, or a prediction-market figure — " +
      'including a direct comparison of two named entities (e.g. "Intel vs Nvidia revenue"). ' +
      "Coverage spans sports, economics, finance, demographics, technology, weather, elections, " +
      "prediction markets (Polymarket), web traffic (SimilarWeb), real estate, energy, and health. " +
      "Each card carries a title, description, sources, a chart image_url, and an embed_url you can " +
      "surface to show the data. Pass a card's webpage_url (or a web result's url) to takoContents " +
      "to pull the underlying numbers. Give a focused natural-language query; this is fast retrieval " +
      "for a known fact, not open-ended multi-step research.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("Natural-language description of what you're looking for"),
    }),
    execute: async ({ query }: { query: string }) =>
      callTako<TakoSearchResult>({
        baseUrl: resolveBaseUrl(config),
        path: "/api/v3/search",
        apiKey: resolveApiKey(config),
        body: buildSearchRequestBody(config, query),
        operation: "search",
      }),
  });
}
