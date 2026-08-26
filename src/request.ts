import type {
  ContentsRequest,
  DataSourceSettings,
  GeoLocation,
  OutputSettings,
  SearchRequest,
  Sources,
  WebSourceSettings,
} from "tako-sdk";
import type {
  TakoAnswerResponse,
  TakoAnswerResult,
  TakoContentsConfig,
  TakoContentsResponse,
  TakoContentsResult,
  TakoDataSourceOptions,
  TakoGeoLocation,
  TakoRetrievalConfig,
  TakoSearchResponse,
  TakoSearchResult,
  TakoWebSourceOptions,
} from "./types";

const DEFAULT_BASE_URL = "https://tako.com";

export function resolveApiKey(config: { apiKey?: string }): string | undefined {
  return config.apiKey ?? process.env.TAKO_API_KEY ?? process.env.TAKO_API_TOKEN;
}

export function resolveBaseUrl(config: { baseUrl?: string }): string {
  return (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/**
 * Parse a `YYYY-MM-DD` option into the `Date` the generated request type
 * carries. `WebSourceSettingsToJSON` serializes it back as
 * `toISOString().substring(0, 10)`; `new Date("YYYY-MM-DD")` is UTC midnight,
 * so the wire value equals the input.
 *
 * The round-trip check is what makes that last clause true. A day past the end
 * of a real month parses and rolls forward rather than failing: `2026-02-31`
 * becomes `2026-03-03`, `2026-04-31` becomes `2026-05-01`. Left unchecked the
 * caller's date silently isn't the one Tako filters on. Only an out-of-range
 * month or day beyond 31 gives an Invalid Date on its own.
 */
function isoDate(value: string, name: string): Date {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value) : new Date(NaN);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${name} must be an ISO date "YYYY-MM-DD", got ${JSON.stringify(value)}`);
  }
  if (date.toISOString().substring(0, 10) !== value) {
    throw new Error(`${name} is not a real calendar date: ${JSON.stringify(value)}`);
  }
  return date;
}

/**
 * Map web source options to the API's `WebSourceSettings`.
 *
 * Numeric bounds are deliberately not checked here. The schema carries them and
 * the API enforces them, so a limit raised by Tako needs no release of this SDK.
 */
export function buildWebSourceSettings(o: TakoWebSourceOptions): WebSourceSettings {
  const body: WebSourceSettings = {};
  if (o.count !== undefined) body.count = o.count;
  if (o.includeContents !== undefined) body.include_contents = o.includeContents;
  if (o.category !== undefined) body.category = o.category;
  if (o.includeDomains !== undefined) body.include_domains = o.includeDomains;
  if (o.excludeDomains !== undefined) body.exclude_domains = o.excludeDomains;
  if (o.snippetMaxChars !== undefined) body.snippet_max_chars = o.snippetMaxChars;
  if (o.articleContentMaxChars !== undefined) {
    body.article_content_max_chars = o.articleContentMaxChars;
  }
  if (o.publishedAfter !== undefined) body.published_after = isoDate(o.publishedAfter, "publishedAfter");
  if (o.publishedBefore !== undefined) body.published_before = isoDate(o.publishedBefore, "publishedBefore");
  return body;
}

/**
 * Throw when data source options contradict themselves.
 *
 * This is the only local validation in this file. It is a logical invariant of
 * the API, not a numeric limit: strict mode matches against `node_ids`, so an
 * empty list can never match a card. Numeric bounds stay unchecked so the API
 * remains the authority.
 *
 * `takoSearch` and `takoAnswer` call this when the tool is built, so a developer
 * sees the error at wiring time. Reaching it from `execute` instead would hand
 * the message to the model, which can neither supply node ids nor edit the
 * config, and which would retry until the step limit.
 */
export function assertValidDataSourceOptions(o: TakoDataSourceOptions): void {
  if (o.strict && !o.nodeIds?.length) {
    throw new Error(
      "strict requires a non-empty nodeIds. Add node ids from the /v1/graph endpoints, or set strict to false.",
    );
  }
}

/**
 * Assert the invariants of whichever data source a retrieval config carries.
 *
 * Call this when a tool is built. `sources.tako` is the deprecated alias for
 * `sources.data`, so both routes must be checked.
 */
export function assertValidRetrievalConfig(config: TakoRetrievalConfig): void {
  const dataSource = config.sources?.data ?? config.sources?.tako;
  if (dataSource) assertValidDataSourceOptions(dataSource);
}

/** Map data source options to the API's `DataSourceSettings`. */
export function buildDataSourceSettings(o: TakoDataSourceOptions): DataSourceSettings {
  assertValidDataSourceOptions(o);
  const body: DataSourceSettings = {};
  if (o.count !== undefined) body.count = o.count;
  if (o.includeContents !== undefined) body.include_contents = o.includeContents;
  if (o.mode !== undefined) body.mode = o.mode;
  if (o.contentFormat !== undefined) body.content_format = o.contentFormat;
  if (o.nodeIds !== undefined) body.node_ids = o.nodeIds;
  if (o.strict !== undefined) body.strict = o.strict;
  return body;
}

/** Map end-user coordinates to the API's `GeoLocation`. Both keys are required. */
export function buildGeoLocation(o: TakoGeoLocation): GeoLocation {
  return { latitude: o.latitude, longitude: o.longitude };
}

/** Map output options to the API's `OutputSettings`. */
export function buildOutputSettings(
  o: NonNullable<TakoRetrievalConfig["outputSettings"]>,
): OutputSettings {
  const body: OutputSettings = {};
  if (o.imageDarkMode !== undefined) body.image_dark_mode = o.imageDarkMode;
  if (o.forceRefresh !== undefined) body.force_refresh = o.forceRefresh;
  return body;
}

/**
 * Map a retrieval config + query to the snake_case POST body the API expects.
 *
 * Only `query` is sent unconditionally, because only `query` is required. Every
 * other key appears when the caller sets it. Earlier versions sent `effort`,
 * `country_code` and `locale` with the values "fast", "US" and "en-US" — the
 * server defaults, restated here. That made a default Tako changes server-side
 * need a release of this SDK, which is the rot the section above avoids.
 */
export function buildSearchRequestBody(
  config: TakoRetrievalConfig,
  query: string,
): SearchRequest {
  const body: SearchRequest = { query };

  if (config.effort !== undefined) body.effort = config.effort;
  if (config.countryCode !== undefined) body.country_code = config.countryCode;
  if (config.locale !== undefined) body.locale = config.locale;

  if (config.sources) {
    const sources: Sources = {};
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

/**
 * Map a url + contents config to the POST body the contents endpoint expects.
 *
 * `mode` defaults to "url" here. The tool builder resolves the same default
 * separately, to pick the description text the model reads.
 */
export function buildContentsRequestBody(
  url: string,
  config: TakoContentsConfig,
): ContentsRequest {
  const body: ContentsRequest = { url, mode: config.mode ?? "url" };
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
