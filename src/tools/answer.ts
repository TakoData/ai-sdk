import { tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import { buildSearchRequestBody, resolveApiKey, resolveBaseUrl } from "../request";
import type { TakoRetrievalConfig, TakoAnswerResult } from "../types";

/** Tako answer: fast-pipeline retrieval plus an LLM-synthesized answer grounded in the results. */
export function takoAnswer(config: TakoRetrievalConfig = {}) {
  return tool({
    description:
      "Ask Tako a question and get a synthesized, well-sourced answer plus the backing " +
      "Tako cards and web results (cards[0] is the lead card). Use this when you want a " +
      "direct answer rather than raw search results.",
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
