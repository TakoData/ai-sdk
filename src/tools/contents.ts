import { tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import { resolveApiKey, resolveBaseUrl } from "../request";
import type { TakoContentsConfig, TakoContentsResult } from "../types";

/** Download the data behind a result URL: a Tako card's CSV or a web page's text. */
export function takoContents(config: TakoContentsConfig = {}) {
  return tool({
    description:
      "Download the underlying data behind a Tako card or web result. Pass a card's " +
      "webpage_url (yields a CSV of its data) or a web result's url (yields the page's " +
      "extracted text). Returns a short-lived presigned download link, or the content " +
      "inline when configured.",
    inputSchema: z.object({
      url: z
        .string()
        .min(1)
        .describe("A TakoCard.webpage_url or WebResult.url to download contents for"),
    }),
    execute: async ({ url }: { url: string }) =>
      callTako<TakoContentsResult>({
        baseUrl: resolveBaseUrl(config),
        path: "/api/v1/contents",
        apiKey: resolveApiKey(config),
        body: { url, mode: config.mode ?? "url" },
        operation: "fetch contents",
      }),
  });
}
