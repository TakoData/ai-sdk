import { tool, type Tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import {
  buildContentsRequestBody,
  normalizeContentsResult,
  resolveApiKey,
  resolveBaseUrl,
} from "../request";
import type { TakoContentsConfig, TakoContentsResponse, TakoContentsResult } from "../types";

/**
 * Download the data behind a result URL: a Tako card's CSV or a web page's text.
 *
 * `mode` sets the delivery, and is reflected in the tool description the model reads:
 * - `"url"` (default) — a short-lived presigned download url. Use when handing a
 *   download/embed link to a user, or for large data you won't read yourself.
 * - `"inline"` — the content in the response body, so the model can read and reason
 *   over the numbers directly.
 */
export function takoContents(
  config: TakoContentsConfig = {},
): Tool<{ url: string }, TakoContentsResult> {
  const mode = config.mode ?? "url";
  return tool({
    description:
      "Fetch the real data behind a result url — a Tako card's webpage_url yields its " +
      "rows; any other url (a web result's) yields the page's full extracted text. Only " +
      "call this on a url returned by a prior search or answer call, which gives you a " +
      "caption and a chart but not the rows.\n\n" +
      // `quoteOnly` outranks `mode`: the API ignores mode on a quote and returns
      // null for url and every payload field. Describing either delivery here
      // would promise content that never arrives, and the model's cheapest
      // recovery from an unexplained null is to call again.
      (config.quoteOnly
        ? "Configured for price quotes only: returns the export cost and rate card, and NO " +
          "content. The url and data fields are always null and the call is free — report " +
          "the price, and do not call again expecting rows.\n\n"
        : mode === "inline"
          ? "Returns the content in the response body — read and compute over the numbers " +
            "directly.\n\n"
          : "Returns a short-lived presigned download url, NOT the data itself: surface the " +
            "link, do not parse it or call again expecting rows.\n\n") +
      "Only cards whose exportable field is true can be downloaded; a non-exportable card " +
      "always returns 403 and retrying will not change that — get its figures from the " +
      "answer tool instead, naming the period you need. Web urls always work, so this is " +
      "also the fallback when a search surfaced a relevant web result but no fitting data " +
      "card.\n\n" +
      "On each returned item, content_format names the serialization for card data and is " +
      "null or absent for web page text; total_rows and truncated tell you whether the card " +
      "had more rows than were returned.",
    inputSchema: z.object({
      // Validated as a url so a malformed value fails here, with a message the
      // model can act on, instead of costing a priced round trip to the API.
      url: z
        .url()
        .describe("A TakoCard.webpage_url or WebResult.url to download contents for"),
    }),
    execute: async ({ url }: { url: string }) =>
      normalizeContentsResult(
        await callTako<TakoContentsResponse>({
          baseUrl: resolveBaseUrl(config),
          path: "/api/v1/contents",
          apiKey: resolveApiKey(config),
          body: buildContentsRequestBody(url, config),
          operation: "fetch contents",
        }),
      ),
  });
}
