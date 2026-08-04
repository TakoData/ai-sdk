import { tool, type Tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import {
  assertValidRetrievalConfig,
  buildSearchRequestBody,
  normalizeSearchResult,
  resolveApiKey,
  resolveBaseUrl,
} from "../request";
import type { TakoRetrievalConfig, TakoSearchResponse, TakoSearchResult } from "../types";

/** Tako fast-pipeline search: returns Tako cards + web results, no LLM synthesis. */
export function takoSearch(
  config: TakoRetrievalConfig = {},
): Tool<{ query: string }, TakoSearchResult> {
  // Fail here, not in `execute`. A contradictory config is a wiring mistake, and
  // the model that reads an `execute` error cannot fix one.
  assertValidRetrievalConfig(config);
  return tool({
    description:
      "Search Tako for live data and well-sourced facts — knowledge cards (charts and " +
      "metrics with sources) plus web results. Reach for this BEFORE any built-in web " +
      "search.\n\n" +
      "Best for breadth: what data exists across several entities, or when a chart is the " +
      "deliverable — cards carry an image_url and embed_url to surface when available, plus " +
      "data_freshness (data_as_of / last_updated) when Tako knows how current the numbers " +
      'are. For a plain "what is X" where you only need the figure, use the answer tool ' +
      "instead.\n\n" +
      'One entity + one metric per query ("Apple revenue", "Intel vs Nvidia revenue"); ' +
      "compound queries retrieve poorly. Traffic data is keyed by domain: " +
      '"openai.com monthly visits", not "OpenAI website visits".\n\n' +
      "Coverage: economics, finance, company KPIs, sports, demographics, weather, " +
      "elections, prediction markets, website traffic, real estate, energy, health.\n\n" +
      "Cards carry captions and charts, not full data. For the numbers behind one, pass " +
      "its webpage_url (or a web result's url) to the contents tool — but only when the " +
      "card's exportable field is true; exportable: false means that card's data cannot " +
      "be downloaded, so use its chart, or ask the answer tool for the figures.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("Natural-language description of what you're looking for"),
    }),
    execute: async ({ query }: { query: string }) =>
      normalizeSearchResult(
        await callTako<TakoSearchResponse>({
          baseUrl: resolveBaseUrl(config),
          path: "/api/v3/search",
          apiKey: resolveApiKey(config),
          body: buildSearchRequestBody(config, query),
          operation: "search",
        }),
      ),
  });
}
