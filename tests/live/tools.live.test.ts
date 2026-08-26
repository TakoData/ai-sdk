/**
 * Live smoke checks that each tool executes end to end.
 *
 * `options.live.test.ts` posts request bodies with a raw `fetch`, so it proves
 * the API accepts what the builders produce and nothing else. Everything 4.0
 * replaced sits below that: the generated `Tako` facade, the `basePath` that
 * appends `/api`, the key resolved on first call, and `wrapTakoError`. Under a
 * stubbed fetch those all pass; none of them had ever run against the real API.
 * These tests close that, per the design spec: each tool executes and returns a
 * normalized result.
 *
 * The two rules of the live suite still hold. Assert contract, never content.
 * Never trigger a billed export — the contents check quotes with `quoteOnly`,
 * which prices an export for free.
 */
import { describe, expect, it } from "vitest";
import { takoAnswer, takoContents, takoSearch } from "../../src/index";
import type { TakoAnswerResult, TakoContentsResult, TakoSearchResult } from "../../src/types";
import { runTool } from "../_helpers";

const KEY = process.env.TAKO_API_KEY ?? process.env.TAKO_API_TOKEN;
const BASE = process.env.TAKO_BASE_URL;
const TIMEOUT = 60_000;

// Pass baseUrl only when the environment sets one, so an unset variable tests
// the same default host a consumer gets.
const config = BASE ? { baseUrl: BASE } : {};

describe.skipIf(!KEY)("live: each tool executes and returns a normalized result", () => {
  it(
    "takoSearch returns the collections always present, whatever the API omits",
    async () => {
      const res = (await runTool(takoSearch(config), { query: "nvidia revenue" })) as TakoSearchResult;
      // Normalization is the contract: the wire type makes both collections
      // optional, the tool result makes them required.
      expect(Array.isArray(res.cards)).toBe(true);
      expect(Array.isArray(res.web_results)).toBe(true);
      expect(typeof res.request_id).toBe("string");
    },
    TIMEOUT,
  );

  it(
    "takoAnswer returns a synthesized answer alongside its backing results",
    async () => {
      const res = (await runTool(takoAnswer(config), {
        query: "what is nvidia's revenue",
      })) as TakoAnswerResult;
      expect(typeof res.answer).toBe("string");
      expect(res.answer.length).toBeGreaterThan(0);
      expect(Array.isArray(res.cards)).toBe(true);
      expect(Array.isArray(res.web_results)).toBe(true);
      expect(typeof res.request_id).toBe("string");
    },
    TIMEOUT,
  );

  it(
    "takoContents quotes a real card's export without buying it",
    async () => {
      const found = (await runTool(takoSearch(config), { query: "nvidia revenue" })) as TakoSearchResult;
      const url = found.cards.find((c) => c.exportable && c.webpage_url)?.webpage_url;
      if (!url) return; // Nothing exportable came back; not this test's failure.

      const res = (await runTool(takoContents({ ...config, quote_only: true }), {
        url,
      })) as TakoContentsResult;
      expect(Array.isArray(res.contents)).toBe(true);
      expect(typeof res.request_id).toBe("string");

      const item = res.contents[0];
      if (!item) return;
      // A quote carries pricing and withholds the payload.
      expect(item.data ?? null).toBeNull();
      expect(item.url ?? null).toBeNull();
      expect(typeof item.cost).toBe("number");
    },
    TIMEOUT,
  );
});
