/**
 * Live smoke checks against the real Tako API.
 *
 * `pnpm test` runs against a stubbed fetch, so nothing there proves the API
 * accepts an option or returns the envelope the tools normalize. These tests
 * send real requests to check exactly that. Whether the API still matches its
 * OpenAPI spec is `tako-sdk`'s contract (its types are generated from the spec)
 * and the monorepo's conformance suite's job, not this package's.
 *
 * Excluded from `pnpm test`. Run with `pnpm test:live` and a key, or let the
 * `live` workflow run it on a schedule. Without `TAKO_API_KEY` every test skips
 * rather than fails, so a contributor with no key sees no red.
 *
 * Two rules for anything added here:
 *
 * 1. Assert contract, never content. "A card came back" is stable; "the first
 *    card is Nvidia revenue" is a ranking change away from a false alarm.
 * 2. Never trigger a billed export. `quoteOnly` prices one for free, and that is
 *    the only way this file touches export pricing.
 */
import { describe, expect, it } from "vitest";
import { ContentsRequestToJSON, SearchRequestToJSON } from "tako-sdk";
import { buildContentsRequestBody, buildSearchRequestBody } from "../../src/request";
import type { TakoContentsConfig, TakoRetrievalConfig } from "../../src/types";

const KEY = process.env.TAKO_API_KEY ?? process.env.TAKO_API_TOKEN;

// Defaults to the same host the SDK does. Set TAKO_BASE_URL to point at another
// environment; no hostname other than the public default is committed here.
const BASE = (process.env.TAKO_BASE_URL ?? "https://tako.com").replace(/\/+$/, "");

const TIMEOUT = 60_000;

async function post(path: string, body: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "X-API-Key": KEY as string, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // A non-JSON body is itself the failure; the assertion reports `text`.
  }
  return { status: response.status, json, text };
}

const search = (config: TakoRetrievalConfig, query = "nvidia revenue") =>
  post("/api/v3/search", SearchRequestToJSON(buildSearchRequestBody(config, query)));

const hostsOf = (json: Record<string, unknown> | null) =>
  ((json?.web_results as { url: string }[] | undefined) ?? []).map((w) => {
    try {
      return new URL(w.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  });

describe.skipIf(!KEY)("live: the request options reach a real API", () => {
  it(
    "a query-only body is accepted, and matches one that restates the old defaults",
    async () => {
      // This is why the check exists. 3.0.0 stopped sending effort, country_code
      // and locale, on the evidence that the spec documents exactly the values
      // the SDK used to hardcode. "The document says X is the default" and "the
      // API applies X when the key is absent" are different claims, and only
      // this one tests the second.
      const bare = buildSearchRequestBody({}, "nvidia revenue");
      expect(Object.keys(bare)).toEqual(["query"]);

      const [a, b] = await Promise.all([
        search({}),
        search({ effort: "fast", countryCode: "US", locale: "en-US" }),
      ]);

      expect(a.status, a.text.slice(0, 300)).toBe(200);
      expect(b.status, b.text.slice(0, 300)).toBe(200);
      expect(Object.keys(a.json ?? {}).sort()).toEqual(Object.keys(b.json ?? {}).sort());
      expect((a.json?.web_results as unknown[] | undefined)?.length).toBe(
        (b.json?.web_results as unknown[] | undefined)?.length,
      );
    },
    TIMEOUT,
  );

  // A rejected option is an HTTP 400 with "Extra inputs are not permitted",
  // which is how `deferDataRetrieval` failed for two months while typed as valid.
  const accepted: [string, TakoRetrievalConfig][] = [
    ["location", { location: { latitude: 37.77, longitude: -122.42 } }],
    ["data.contentFormat", { sources: { data: { includeContents: true, contentFormat: "json_records" } } }],
    ["data.mode", { sources: { data: { includeContents: true, mode: "inline" } } }],
    ["web.category", { sources: { web: { category: "news" } } }],
    ["web.includeDomains", { sources: { web: { includeDomains: ["reuters.com"] } } }],
    ["web.excludeDomains", { sources: { web: { excludeDomains: ["reddit.com"] } } }],
    ["web.snippetMaxChars", { sources: { web: { snippetMaxChars: 300 } } }],
    ["web.articleContentMaxChars", { sources: { web: { includeContents: true, articleContentMaxChars: 5000 } } }],
    ["web.publishedAfter", { sources: { web: { publishedAfter: "2026-01-01" } } }],
    ["web.publishedBefore", { sources: { web: { publishedBefore: "2026-12-31" } } }],
  ];

  it.each(accepted)("the API accepts %s", async (_name, config) => {
    const r = await search(config);
    expect(r.status, r.text.slice(0, 300)).toBe(200);
  }, TIMEOUT);

  it(
    "a live search response has the envelope the tools normalize",
    async () => {
      const r = await search({ sources: { data: { includeContents: true }, web: { count: 3 } } });
      expect(r.status).toBe(200);
      expect(typeof r.json?.request_id).toBe("string");
      for (const key of ["cards", "web_results"]) {
        if (r.json?.[key] !== undefined) expect(Array.isArray(r.json?.[key])).toBe(true);
      }
    },
    TIMEOUT,
  );

  it(
    "includeDomains and excludeDomains actually filter",
    async () => {
      const only = await search(
        { sources: { web: { includeDomains: ["reuters.com"], count: 5 } } },
        "nvidia earnings",
      );
      expect(only.status).toBe(200);
      const kept = hostsOf(only.json);
      // An empty list means the filter applied and nothing matched, which is a
      // pass for "it filters" — a leak is the failure.
      expect(kept.filter((h) => h && !h.endsWith("reuters.com"))).toEqual([]);

      const unfiltered = await search({ sources: { web: { count: 5 } } }, "nvidia earnings");
      const drop = hostsOf(unfiltered.json)[0];
      if (drop) {
        const without = await search(
          { sources: { web: { excludeDomains: [drop], count: 5 } } },
          "nvidia earnings",
        );
        expect(without.status).toBe(200);
        expect(hostsOf(without.json)).not.toContain(drop);
      }
    },
    TIMEOUT * 2,
  );

  it.each([
    ["json_records", "records"],
    ["json_compact", "dataset"],
  ] as const)(
    "contentFormat %s is honored and populates %s",
    async (format, field) => {
      const r = await search({
        sources: { data: { includeContents: true, contentFormat: format, count: 1 } },
      });
      expect(r.status).toBe(200);
      const content = (r.json?.cards as { content?: Record<string, unknown> }[] | undefined)?.[0]
        ?.content;
      if (!content) return; // No inlined card to inspect; nothing to assert.
      expect(content.content_format).toBe(format);
      expect(content[field]).not.toBeNull();
    },
    TIMEOUT,
  );
});

describe.skipIf(!KEY)("live: contents pricing, quoted rather than bought", () => {
  it(
    "quoteOnly returns a price and no content, and maxRows clamps instead of failing",
    async () => {
      const seed = await search({});
      expect(seed.status).toBe(200);
      const url = (seed.json?.cards as { webpage_url?: string }[] | undefined)?.[0]?.webpage_url;
      if (!url) return; // No card to quote against.

      const quote = async (config: TakoContentsConfig) => {
        const r = await post("/api/v1/contents", ContentsRequestToJSON(buildContentsRequestBody(url, config)));
        expect(r.status, r.text.slice(0, 300)).toBe(200);
        expect(typeof r.json?.request_id).toBe("string");
        return (r.json?.contents as Record<string, unknown>[] | undefined)?.[0];
      };

      const small = await quote({ quoteOnly: true, maxRows: 20 });
      const large = await quote({ quoteOnly: true, maxRows: 2000 });
      if (!small || !large) return;

      // A quote carries pricing and withholds content.
      expect(small.url ?? null).toBeNull();
      expect(small.data ?? null).toBeNull();
      expect(small.export_pricing).toBeTruthy();

      // `cost` on a quote is the price the export would be, not a charge — which
      // is only observable because it scales with maxRows.
      expect(typeof small.cost).toBe("number");
      expect(large.cost as number).toBeGreaterThan(small.cost as number);

      // The documented behavior worth a live test: over the ceiling the API
      // clamps and bills what it returns, so a caller trusting a 400 gets a
      // short export, a charge, and no error.
      const over = await quote({ quoteOnly: true, maxRows: 999_999 });
      if (over) expect(over.cost).toBe(large.cost);
    },
    TIMEOUT * 3,
  );
});
