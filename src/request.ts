import type {
  TakoAnswerResponse,
  TakoAnswerResult,
  TakoContentFormat,
  TakoContentsConfig,
  TakoContentsMode,
  TakoContentsResponse,
  TakoContentsResult,
  TakoDataSourceOptions,
  TakoGeoLocation,
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
  sources?: { data?: DataSourceSettingsBody; web?: WebSourceSettingsBody };
  location?: GeoLocationBody;
  timezone?: string;
  output_settings?: OutputSettingsBody;
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

export interface DataSourceSettingsBody {
  count?: number;
  include_contents?: boolean;
  mode?: TakoContentsMode;
  content_format?: TakoContentFormat;
  node_ids?: string[];
  strict?: boolean;
}

/**
 * Map data source options to the API's `DataSourceSettings`.
 *
 * The `strict` check is the only local validation in this file. It is a logical
 * invariant of the API, not a numeric limit: strict mode matches against
 * `node_ids`, so an empty list can never match a card and the billed request is
 * wasted. Numeric bounds stay unchecked so the API remains the authority.
 */
export function buildDataSourceSettings(o: TakoDataSourceOptions): DataSourceSettingsBody {
  if (o.strict && !o.nodeIds?.length) {
    throw new Error(
      "strict requires a non-empty nodeIds. Add node ids from the /v1/graph endpoints, or set strict to false.",
    );
  }
  const body: DataSourceSettingsBody = {};
  if (o.count !== undefined) body.count = o.count;
  if (o.includeContents !== undefined) body.include_contents = o.includeContents;
  if (o.mode !== undefined) body.mode = o.mode;
  if (o.contentFormat !== undefined) body.content_format = o.contentFormat;
  if (o.nodeIds !== undefined) body.node_ids = o.nodeIds;
  if (o.strict !== undefined) body.strict = o.strict;
  return body;
}

export interface GeoLocationBody {
  latitude: number;
  longitude: number;
}

/** Map end-user coordinates to the API's `GeoLocation`. Both keys are required. */
export function buildGeoLocation(o: TakoGeoLocation): GeoLocationBody {
  return { latitude: o.latitude, longitude: o.longitude };
}

export interface OutputSettingsBody {
  image_dark_mode?: boolean;
  force_refresh?: boolean;
}

/** Map output options to the API's `OutputSettings`. */
export function buildOutputSettings(
  o: NonNullable<TakoRetrievalConfig["outputSettings"]>,
): OutputSettingsBody {
  const body: OutputSettingsBody = {};
  if (o.imageDarkMode !== undefined) body.image_dark_mode = o.imageDarkMode;
  if (o.forceRefresh !== undefined) body.force_refresh = o.forceRefresh;
  return body;
}

/** Map a retrieval config + query to the snake_case POST body the API expects. */
export function buildSearchRequestBody(
  config: TakoRetrievalConfig,
  query: string,
): SearchRequestBody {
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
    if (dataSource) sources.data = buildDataSourceSettings(dataSource);
    if (config.sources.web) sources.web = buildWebSourceSettings(config.sources.web);
    body.sources = sources;
  }

  if (config.location !== undefined) body.location = buildGeoLocation(config.location);
  if (config.timezone !== undefined) body.timezone = config.timezone;
  if (config.outputSettings) body.output_settings = buildOutputSettings(config.outputSettings);

  return body;
}

export interface ContentsRequestBody {
  url: string;
  mode: TakoContentsMode;
  content_format?: TakoContentFormat;
  max_rows?: number;
  max_chars?: number;
  quote_only?: boolean;
}

/**
 * Map a url + contents config to the POST body the contents endpoint expects.
 *
 * `mode` keeps its "url" default here because the tool's description changes with
 * it, so the value must be resolved before the tool is built.
 */
export function buildContentsRequestBody(
  url: string,
  config: TakoContentsConfig,
): ContentsRequestBody {
  const body: ContentsRequestBody = { url, mode: config.mode ?? "url" };
  if (config.contentFormat !== undefined) body.content_format = config.contentFormat;
  if (config.maxRows !== undefined) body.max_rows = config.maxRows;
  if (config.maxChars !== undefined) body.max_chars = config.maxChars;
  if (config.quoteOnly !== undefined) body.quote_only = config.quoteOnly;
  return body;
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
