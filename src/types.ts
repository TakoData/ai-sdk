// Wire types come from `tako-sdk`, Tako's generated client, and are re-exported
// here under the names this package has always used. This file declares only
// the developer-facing config and the normalized tool results.
import type * as sdk from "tako-sdk";

// ----- Enums / unions -----

export type TakoSearchEffort = sdk.SearchEffortLevel;
export type TakoContentsMode = sdk.ContentsDeliveryMode;
/** Serialization of tabular (Tako card) data. Web text carries no format. */
export type TakoContentFormat = sdk.ContentsFormat;
/** Public source taxonomy for the card surfaces. */
export type TakoSourceIndex = sdk.TakoSourceIndex;
export type TakoKnowledgeCardRelevance = sdk.KnowledgeCardRelevance;
export type TakoGraphNodeType = sdk.GraphNodeType;
export type TakoDatasetColumnType = sdk.TakoDatasetColumnType;
/** Web result category. Only "news" filters today; the others are accepted and inert. */
export type TakoWebCategory = sdk.WebCategory;

// ----- Config -----
//
// A tool's config is the API request body for its endpoint, minus the field
// the model supplies (`query` or `url`), plus the two connection fields. Keys
// are the API's snake_case names, exactly as `tako-sdk` declares them, so an
// option Tako adds reaches you when you bump `tako-sdk`, with no release here.
// Field docs live on the `tako-sdk` types and in the API reference.

export interface TakoBaseConfig {
  /** Tako API key. Falls back to TAKO_API_KEY / TAKO_API_TOKEN env vars. */
  apiKey?: string;
  /** API base URL. Default "https://tako.com". */
  baseUrl?: string;
}

/**
 * The curated Tako data source. Three `DataSourceSettings` keys are omitted
 * because you can't use them correctly from this package:
 *
 * - `mode` — the API documents it as having no effect on Tako cards, which
 *   always inline rows. Setting `"url"` looks like it should return download
 *   links and doesn't.
 * - `node_ids` — takes ids from the `/v1/graph` endpoints, which this package
 *   doesn't wrap, and the ids don't survive a knowledge-graph rebuild.
 * - `strict` — only meaningful with `node_ids`.
 *
 * The omission is a type. The API accepts the keys if you send them anyway.
 */
export type TakoDataSourceOptions = Omit<sdk.DataSourceSettings, "mode" | "node_ids" | "strict">;

/** The web source. Every `WebSourceSettings` key, unchanged. */
export type TakoWebSourceOptions = sdk.WebSourceSettings;

/** A source is searched iff its key is present. Omit `sources` to search data + web. */
export interface TakoSources {
  data?: TakoDataSourceOptions;
  web?: TakoWebSourceOptions;
}

/** Config for `takoSearch`: the `/v3/search` request body without `query`. */
export interface TakoRetrievalConfig extends TakoBaseConfig, Omit<sdk.SearchRequest, "query" | "sources"> {
  sources?: TakoSources;
}

/**
 * Config for `takoAnswer`: the `/v1/answer` request body without `query`.
 * A superset of {@link TakoRetrievalConfig}, so one config object can build
 * both tools. Adds `output_schema`, a JSON Schema Tako fills from the same
 * evidence as `answer` and returns as `structured_output`.
 */
export interface TakoAnswerConfig extends TakoBaseConfig, Omit<sdk.AnswerRequest, "query" | "sources"> {
  sources?: TakoSources;
}

/**
 * Config for `takoContents`: the `/v1/contents` request body without `url`.
 * `mode` and `quote_only` also change the tool description the model reads.
 */
export interface TakoContentsConfig extends TakoBaseConfig, Omit<sdk.ContentsRequest, "url"> {}

// ----- Usage / billing -----

export type TakoUsageCompute = sdk.UsageCompute;
export type TakoUsageData = sdk.UsageData;
/**
 * Usage for one metered request. As of 2026-08 the API doesn't populate it on
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
