import type {
  TakoAnswerResponse,
  TakoAnswerResult,
  TakoContentsMode,
  TakoContentsResponse,
  TakoContentsResult,
  TakoRetrievalConfig,
  TakoSearchResponse,
  TakoSearchResult,
  TakoWebCategory,
  TakoWebSourceOptions,
} from "./types";

const DEFAULT_BASE_URL = "https://tako.com";

export function resolveApiKey(config: { apiKey?: string }): string | undefined {
  return config.apiKey ?? process.env.TAKO_API_KEY ?? process.env.TAKO_API_TOKEN;
}

export function resolveBaseUrl(config: { baseUrl?: string }): string {
  return (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export interface SearchRequestBody {
  query: string;
  effort: string;
  country_code: string;
  locale: string;
  sources?: {
    data?: { count?: number; include_contents?: boolean };
    web?: { count?: number; include_contents?: boolean };
  };
  timezone?: string;
  output_settings?: { image_dark_mode?: boolean; force_refresh?: boolean };
}

export interface WebSourceSettingsBody {
  count?: number;
  include_contents?: boolean;
  category?: TakoWebCategory;
  include_domains?: string[];
  exclude_domains?: string[];
  snippet_max_chars?: number;
  article_content_max_chars?: number;
  published_after?: string;
  published_before?: string;
}

/**
 * Map web source options to the API's `WebSourceSettings`.
 *
 * Numeric bounds are deliberately not checked here. The schema carries them and
 * the API enforces them, so a limit raised by Tako needs no release of this SDK.
 */
export function buildWebSourceSettings(o: TakoWebSourceOptions): WebSourceSettingsBody {
  const body: WebSourceSettingsBody = {};
  if (o.count !== undefined) body.count = o.count;
  if (o.includeContents !== undefined) body.include_contents = o.includeContents;
  if (o.category !== undefined) body.category = o.category;
  if (o.includeDomains !== undefined) body.include_domains = o.includeDomains;
  if (o.excludeDomains !== undefined) body.exclude_domains = o.excludeDomains;
  if (o.snippetMaxChars !== undefined) body.snippet_max_chars = o.snippetMaxChars;
  if (o.articleContentMaxChars !== undefined) {
    body.article_content_max_chars = o.articleContentMaxChars;
  }
  if (o.publishedAfter !== undefined) body.published_after = o.publishedAfter;
  if (o.publishedBefore !== undefined) body.published_before = o.publishedBefore;
  return body;
}

/** Map a retrieval config + query to the snake_case POST body the API expects. */
export function buildSearchRequestBody(config: TakoRetrievalConfig, query: string): SearchRequestBody {
  const body: SearchRequestBody = {
    query,
    effort: config.effort ?? "fast",
    country_code: config.countryCode ?? "US",
    locale: config.locale ?? "en-US",
  };

  if (config.sources) {
    const sources: NonNullable<SearchRequestBody["sources"]> = {};
    // `data` is the curated Tako source; `tako` is the deprecated legacy alias.
    const dataSource = config.sources.data ?? config.sources.tako;
    if (dataSource) {
      const data: NonNullable<NonNullable<SearchRequestBody["sources"]>["data"]> = {};
      if (dataSource.count !== undefined) data.count = dataSource.count;
      if (dataSource.includeContents !== undefined) data.include_contents = dataSource.includeContents;
      sources.data = data;
    }
    if (config.sources.web) {
      const web: NonNullable<NonNullable<SearchRequestBody["sources"]>["web"]> = {};
      if (config.sources.web.count !== undefined) web.count = config.sources.web.count;
      if (config.sources.web.includeContents !== undefined) web.include_contents = config.sources.web.includeContents;
      sources.web = web;
    }
    body.sources = sources;
  }

  if (config.timezone !== undefined) body.timezone = config.timezone;

  if (config.outputSettings) {
    const output: NonNullable<SearchRequestBody["output_settings"]> = {};
    if (config.outputSettings.imageDarkMode !== undefined) output.image_dark_mode = config.outputSettings.imageDarkMode;
    if (config.outputSettings.forceRefresh !== undefined) output.force_refresh = config.outputSettings.forceRefresh;
    body.output_settings = output;
  }

  return body;
}

export interface ContentsRequestBody {
  url: string;
  mode: TakoContentsMode;
}

/** Map a url + delivery mode to the POST body the contents endpoint expects. */
export function buildContentsRequestBody(url: string, mode: TakoContentsMode): ContentsRequestBody {
  return { url, mode };
}

// ----- Response normalizers -----
//
// The API guarantees only `request_id` (plus `answer` on the answer surface); the
// contract permits omitting the collections, though it currently sends them
// empty. Normalizing either shape lets callers read `result.cards.length`
// without a guard.

export function normalizeSearchResult(response: TakoSearchResponse): TakoSearchResult {
  return {
    ...response,
    cards: response.cards ?? [],
    web_results: response.web_results ?? [],
  };
}

export function normalizeAnswerResult(response: TakoAnswerResponse): TakoAnswerResult {
  return {
    ...response,
    cards: response.cards ?? [],
    web_results: response.web_results ?? [],
  };
}

export function normalizeContentsResult(response: TakoContentsResponse): TakoContentsResult {
  return { ...response, contents: response.contents ?? [] };
}
