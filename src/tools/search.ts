import { tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import { buildSearchRequestBody, resolveApiKey, resolveBaseUrl } from "../request";
import type { TakoRetrievalConfig, TakoSearchResult } from "../types";

/** Tako fast-pipeline search: returns Tako cards + web results, no LLM synthesis. */
export function takoSearch(config: TakoRetrievalConfig = {}) {
  return tool({
    description:
      "Search Tako's knowledge base for visualized data and well-sourced facts. " +
      "Returns Tako knowledge cards (charts/metrics with sources) and web results. " +
      "Use this to find data and the URLs you can then pass to takoContents to download underlying data.",
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
