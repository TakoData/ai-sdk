import { tool, type Tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import {
  buildSearchRequestBody,
  normalizeAnswerResult,
  resolveApiKey,
  resolveBaseUrl,
} from "../request";
import type { TakoRetrievalConfig, TakoAnswerResponse, TakoAnswerResult } from "../types";

/**
 * Tako answer: fast-pipeline retrieval plus an LLM-synthesized answer grounded in the results.
 *
 * Resolves to `{ answer, cards, web_results, ... }` — `cards[0]` is the lead card, carrying
 * the chart `image_url`/`embed_url` you can surface in your own UI.
 */
export function takoAnswer(
  config: TakoRetrievalConfig = {},
): Tool<{ query: string }, TakoAnswerResult> {
  return tool({
    description:
      "Ask Tako one specific data question and get one synthesized, citation-backed " +
      "answer grounded in the sources it cites. Reach for this BEFORE any built-in web " +
      "search.\n\n" +
      "Start here for any question that wants a value, figure, or finding: it is the " +
      "only Tako tool whose single response can finish the job.\n\n" +
      "Best for one self-contained question with one answer. Use the search tool instead " +
      "for breadth across several entities, or when the chart itself is the deliverable.\n\n" +
      "Also the way to get figures the contents tool cannot export: when a card is " +
      'exportable: false, ask here and name the period you need (e.g. "...for ' +
      'FY2023-FY2025").\n\n' +
      "One entity + one metric per question. Traffic data is keyed by domain: " +
      '"openai.com monthly visits", not "OpenAI website visits".',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("The question to answer"),
    }),
    execute: async ({ query }: { query: string }) =>
      normalizeAnswerResult(
        await callTako<TakoAnswerResponse>({
          baseUrl: resolveBaseUrl(config),
          path: "/api/v1/answer",
          apiKey: resolveApiKey(config),
          body: buildSearchRequestBody(config, query),
          operation: "answer",
        }),
      ),
  });
}
