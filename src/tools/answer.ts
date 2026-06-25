import { tool, type Tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import { buildSearchRequestBody, resolveApiKey, resolveBaseUrl } from "../request";
import type { TakoRetrievalConfig, TakoAnswerResult } from "../types";

/** Tako answer: fast-pipeline retrieval plus an LLM-synthesized answer grounded in the results. */
export function takoAnswer(
  config: TakoRetrievalConfig = {},
): Tool<{ query: string }, TakoAnswerResult> {
  return tool({
    description:
      "Ask Tako a factual question and get back a single grounded, citation-backed prose answer " +
      "(not a chart), synthesized from its curated knowledge graph and the live web. Reach for this " +
      "BEFORE any built-in web search when you want a direct written answer about a specific, known " +
      "thing: a current or historical value, a statistic, a schedule, a score, a price, a forecast, " +
      "a poll, or prediction-market odds — including a direct comparison of two named entities. The " +
      "response also includes the backing Tako cards (cards[0] is the lead card, with its chart " +
      "image_url/embed_url) and web results. Want a chart to show rather than prose to read? Use " +
      "takoSearch. Best for a known fact, not open-ended multi-step research.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("The question to answer"),
    }),
    execute: async ({ query }: { query: string }) =>
      callTako<TakoAnswerResult>({
        baseUrl: resolveBaseUrl(config),
        path: "/api/v1/answer",
        apiKey: resolveApiKey(config),
        body: buildSearchRequestBody(config, query),
        operation: "answer",
      }),
  });
}
