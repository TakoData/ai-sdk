import { tool } from "ai";
import { z } from "zod";
import { callTako } from "../client";
import { resolveApiKey, resolveBaseUrl } from "../request";
import type { TakoContentsConfig, TakoContentsResult } from "../types";

/** Download the data behind a result URL: a Tako card's CSV or a web page's text. */
export function takoContents(config: TakoContentsConfig = {}) {
  return tool({
    description:
      "Fetch the underlying data behind a result URL — a Tako card's webpage_url yields a CSV " +
      "of the card's data; any other URL (a web result's url) yields the page's extracted full " +
      "text. Pass a single url taken from a prior takoSearch/takoAnswer result. Delivery is set " +
      'at construction via `mode`: the default "url" returns a short-lived presigned download_url ' +
      '(no row cap) for handing over a download/embed link or for large data you won\'t read ' +
      'yourself; "inline" instead returns the content in the response (CSV capped at 1000 rows, ' +
      "with total_rows/truncated, or web text) so you can read and reason over the numbers directly.",
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
