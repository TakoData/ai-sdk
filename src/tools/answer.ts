import { tool, type Tool } from "ai";
import { z } from "zod";
import { callTako, lazyTakoClient } from "../client";
import { buildAnswerRequestBody, normalizeAnswerResult } from "../request";
import type { TakoAnswerConfig, TakoAnswerResult } from "../types";

/**
 * Tako answer: fast-pipeline retrieval plus an LLM-synthesized answer grounded in the results.
 *
 * Resolves to `{ answer, cards, web_results, ... }` — `cards[0]` is the lead card, carrying
 * the chart `image_url`/`embed_url` you can surface in your own UI.
 */
export function takoAnswer(
  config: TakoAnswerConfig = {},
): Tool<{ query: string }, TakoAnswerResult> {
  const client = lazyTakoClient(config);
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
      '"openai.com monthly visits", not "OpenAI website visits".' +
      // Say this only when output_schema is set. Otherwise the model reads about
      // a field that never arrives, and its cheapest recovery is to call again.
      (config.output_schema
        ? "\n\nThe response also carries structured_output, filled from the same evidence as " +
          "the answer. Read the figures from there; the prose is for the user."
        : ""),
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("The question to answer"),
    }),
    execute: async ({ query }: { query: string }) => {
      const tako = client();
      return normalizeAnswerResult(
        await callTako("answer", () => tako.answer(buildAnswerRequestBody(config, query))),
      );
    },
  });
}
