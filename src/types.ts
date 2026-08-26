// Wire types come from `tako-sdk`, Tako's generated client, and are re-exported
// here under the names this package has always used. Only the developer-facing
// config and the normalized tool results are declared in this file.
import type * as sdk from "tako-sdk";

// ----- Enums / unions -----

export type TakoSearchEffort = sdk.SearchEffortLevel;
export type TakoContentsMode = sdk.ContentsDeliveryMode;
/** Serialization of tabular (Tako card) data. Web text carries no format. */
export type TakoContentFormat = sdk.ContentsFormat;
/** Public source taxonomy for the card surfaces. */
export type TakoSourceIndex = sdk.TakoSourceIndex;
/**
 * @deprecated Renamed to {@link TakoSourceIndex}, and the value set collapsed:
 * 2.x had `"tako" | "web" | "connected_data" | "tako_deep_v2"`, this resolves to
 * `"data" | "web"`. Comparisons against the removed values no longer compile.
 */
export type TakoCardSourceIndex = TakoSourceIndex;
export type TakoKnowledgeCardRelevance = sdk.KnowledgeCardRelevance;
export type TakoGraphNodeType = sdk.GraphNodeType;
export type TakoDatasetColumnType = sdk.TakoDatasetColumnType;
/** Web result category. Only "news" filters today; the others are accepted and inert. */
export type TakoWebCategory = sdk.WebCategory;

// ----- Config (developer-facing, camelCase) -----

export interface TakoBaseConfig {
  /** Tako API key. Falls back to TAKO_API_KEY / TAKO_API_TOKEN env vars. */
  apiKey?: string;
  /** API base URL. Default "https://tako.com". */
  baseUrl?: string;
}

export interface TakoSourceOptions {
  /**
   * Max results for this source, 1-20.
   *
   * The server default differs by tool: `takoSearch` returns 5, `takoAnswer`
   * returns 3. Set this value when you need the same count from both.
   */
  count?: number;
  /** Inline this source's underlying data in the response. */
  includeContents?: boolean;
}

/** Options for the curated Tako data source. Mirrors the API's `DataSourceSettings`. */
export interface TakoDataSourceOptions extends TakoSourceOptions {
  /**
   * Delivery for card data inlined by this search.
   *
   * The API documents this field as having no effect on Tako cards, which always
   * return a small inline preview. It stays for schema stability. This is a
   * different field from {@link TakoContentsConfig.mode}, which does control
   * delivery for an explicit contents call.
   */
  mode?: TakoContentsMode;
  /** Serialization for inlined card data. Server default "json_compact". */
  contentFormat?: TakoContentFormat;
  /**
   * Graph node ids to pin into the search. Get ids from the /v1/graph endpoints,
   * which this SDK does not wrap. Ids do not survive a knowledge-graph rebuild:
   * resolve them per request rather than storing them.
   */
  nodeIds?: string[];
  /** Return only cards that match a pinned node. Requires a non-empty `nodeIds`. */
  strict?: boolean;
}

/** Options for the web source. Mirrors the API's `WebSourceSettings`. */
export interface TakoWebSourceOptions extends TakoSourceOptions {
  /** Restrict web results to a category. */
  category?: TakoWebCategory;
  /** Return only results from these bare hosts, for example "cnn.com". */
  includeDomains?: string[];
  /** Drop results from these bare hosts. */
  excludeDomains?: string[];
  /** Character cap on the excerpt per web result. Server default 1000. */
  snippetMaxChars?: number;
  /** Character cap on full article text when `includeContents` is true. Server default 30000. */
  articleContentMaxChars?: number;
  /**
   * Keep results published on or after this ISO date, "YYYY-MM-DD".
   *
   * This is not a recency guarantee. The API keeps a result whose publication
   * date it does not know, so undated pages still arrive.
   */
  publishedAfter?: string;
  /**
   * Keep results published on or before this ISO date, "YYYY-MM-DD".
   *
   * The API keeps a result whose publication date it does not know.
   */
  publishedBefore?: string;
}

/** @deprecated Renamed to {@link TakoDataSourceOptions}. */
export type TakoCardSourceOptions = TakoDataSourceOptions;

/** End-user coordinates used to localize results. */
export interface TakoGeoLocation {
  /** Degrees, -90 to 90. */
  latitude: number;
  /** Degrees, -180 to 180. */
  longitude: number;
}

export interface TakoRetrievalConfig extends TakoBaseConfig {
  /** "fast" (default) | "instant" | "deep". */
  effort?: TakoSearchEffort;
  /** Per-source settings. A source is searched iff its key is present. Omit to search data + web. */
  sources?: {
    /** The curated Tako data source. */
    data?: TakoDataSourceOptions;
    web?: TakoWebSourceOptions;
    /** @deprecated Use `data`. Legacy alias for the curated Tako source. */
    tako?: TakoDataSourceOptions;
  };
  /** End-user coordinates. Use with `countryCode` for location-sensitive queries. */
  location?: TakoGeoLocation;
  /** ISO 3166-1 alpha-2 country code. Default "US". */
  countryCode?: string;
  /** BCP-47 locale tag. Default "en-US". */
  locale?: string;
  /** IANA timezone, e.g. "America/New_York". */
  timezone?: string;
  outputSettings?: {
    imageDarkMode?: boolean;
    /** Instant mode only. */
    forceRefresh?: boolean;
  };
}

export interface TakoContentsConfig extends TakoBaseConfig {
  /** "url" (default) returns a presigned link; "inline" returns content in the body. */
  mode?: TakoContentsMode;
  /** Serialization for card data. Server default "csv" on this surface. */
  contentFormat?: TakoContentFormat;
  /**
   * Cap on rows returned for a card export. The server default is the 20-row free
   * allowance. Rows above that allowance bill at the per-1000-row rate, so raise
   * this only when you need the extra rows. Web urls ignore this field.
   */
  maxRows?: number;
  /** Character cap on extracted web page text. Server default 1000000, the full page text. Card urls ignore this field. */
  maxChars?: number;
  /**
   * Return only the price of the export, without the content. The request is free
   * and the item's payload and url are null. The server ignores `mode` and
   * `contentFormat`.
   */
  quoteOnly?: boolean;
}

// ----- Usage / billing -----

export type TakoUsageCompute = sdk.UsageCompute;
export type TakoUsageData = sdk.UsageData;
/**
 * Usage for one metered request. As of 2026-08 the API does not populate it on
 * search, answer or contents. For per-item pricing today, read
 * `TakoResultContent.cost` and `TakoResultContent.export_pricing`.
 */
export type TakoUsage = sdk.Usage;

// ----- Content payloads -----

export type TakoDatasetColumn = sdk.TakoDatasetColumn;
export type TakoDatasetSource = sdk.TakoDatasetSource;
export type TakoDatasetCell = sdk.TakoDatasetCell;
export type TakoDataset = sdk.TakoDataset;
export type TakoExportPricing = sdk.ExportPricing;
export type TakoColumnDescriptor = sdk.ColumnDescriptor;
/**
 * Describes the downloadable content behind a result. `content_format` is
 * optional as well as nullable — web text may arrive as `null` or an absent key.
 * Test it loosely (`content_format == null`), never with `=== null`.
 */
export type TakoResultContent = sdk.ResultContent;
export type TakoContentItem = sdk.ContentItem;

// ----- Cards and web results -----

export type TakoCardSource = sdk.TakoCardSource;
/** @deprecated Renamed to {@link TakoCardSource}. */
export type TakoKnowledgeCardSource = TakoCardSource;
export type TakoKnowledgeCardMethodology = sdk.KnowledgeCardMethodology;
export type TakoCardNode = sdk.TakoCardNode;
export type TakoMetricDefinition = sdk.MetricDefinition;
export type TakoDataFreshness = sdk.DataFreshness;
export type TakoCard = sdk.TakoCard;
export type TakoWebResult = sdk.WebResult;

// ----- Wire responses (exactly what the API sends) -----

/** The raw `POST /api/v3/search` body. Only `request_id` is guaranteed. */
export type TakoSearchResponse = sdk.SearchResponse;
/** The raw `POST /api/v1/answer` body. */
export type TakoAnswerResponse = sdk.AnswerResponse;
/** The raw `POST /api/v1/contents` body. */
export type TakoContentsResponse = sdk.ContentsResponse;

// ----- Tool results (normalized: collections always present) -----
//
// Built from the response types so a field the API adds shows up here without
// an edit; only the collections are pinned as required.

export type TakoSearchResult = Omit<TakoSearchResponse, "cards" | "web_results"> & {
  cards: TakoCard[];
  web_results: TakoWebResult[];
};

export type TakoAnswerResult = Omit<TakoAnswerResponse, "cards" | "web_results"> & {
  /** Synthesized text answer. */
  answer: string;
  /** Backing cards; cards[0] is the lead card. */
  cards: TakoCard[];
  web_results: TakoWebResult[];
};

export type TakoContentsResult = Omit<TakoContentsResponse, "contents"> & {
  contents: TakoContentItem[];
};
