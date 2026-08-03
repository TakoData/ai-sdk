// Types mirror Tako's published OpenAPI document. `tests/contract/` validates
// them against a vendored copy of that spec and against `tako-sdk`, Tako's
// official generated client, so drift fails CI. Refresh with `pnpm spec:refresh`.

// ----- Enums / unions -----

export type TakoSearchEffort = "fast" | "instant" | "deep";
export type TakoContentsMode = "url" | "inline";

/** Serialization of tabular (Tako card) data. Web text carries no format. */
export type TakoContentFormat = "csv" | "json_records" | "json_compact";

/** Public source taxonomy for the card surfaces. */
export type TakoSourceIndex = "data" | "web";

/** @deprecated Renamed to {@link TakoSourceIndex}. */
export type TakoCardSourceIndex = TakoSourceIndex;

export type TakoKnowledgeCardRelevance = "High" | "Medium" | "Low";
export type TakoGraphNodeType = "metric" | "entity";
export type TakoDatasetColumnType = "string" | "number" | "boolean" | "date" | "datetime";

// ----- Config (developer-facing, camelCase) -----

export interface TakoBaseConfig {
  /** Tako API key. Falls back to TAKO_API_KEY / TAKO_API_TOKEN env vars. */
  apiKey?: string;
  /** API base URL. Default "https://tako.com". */
  baseUrl?: string;
}

export interface TakoSourceOptions {
  /** Max results for this source, 1–20 (server default 5). */
  count?: number;
  /** Inline this source's underlying data in the response. */
  includeContents?: boolean;
}

/**
 * Options for the curated Tako data source.
 *
 * The API's `DataSourceSettings` also carries `mode`, `content_format`,
 * `node_ids` and `strict`; those are not surfaced yet.
 */
export interface TakoCardSourceOptions extends TakoSourceOptions {}

export interface TakoRetrievalConfig extends TakoBaseConfig {
  /** "fast" (default) | "instant" | "deep". */
  effort?: TakoSearchEffort;
  /** Per-source settings. A source is searched iff its key is present. Omit to search data + web. */
  sources?: {
    /** The curated Tako data source. */
    data?: TakoCardSourceOptions;
    web?: TakoSourceOptions;
    /** @deprecated Use `data`. Legacy alias for the curated Tako source. */
    tako?: TakoCardSourceOptions;
  };
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
}

// ----- Usage / billing -----

export interface TakoUsageCompute {
  /** USD cost of running the operation. */
  cost_usd: number;
}

export interface TakoUsageData {
  /** USD cost of the inline data delivered in the response. */
  cost_usd: number;
  /** Number of billed data units (datasets) in the response. */
  datasets: number;
}

/**
 * Usage for one metered request. `total_cost_usd` always equals the sum of
 * whichever breakdown components are present.
 */
export interface TakoUsage {
  /** Total quoted USD cost of this request. */
  total_cost_usd: number;
  /** Compute breakdown. Absent on surfaces with no compute step (contents). */
  compute?: TakoUsageCompute | null;
  /** Inline-data breakdown. Present only when billable inline data was emitted. */
  data?: TakoUsageData | null;
}

// ----- Content payloads -----

export interface TakoDatasetColumn {
  name: string;
  type: TakoDatasetColumnType;
  /** Structured unit, e.g. "USD billions", "%". Null when unitless. */
  unit?: string | null;
}

export interface TakoDatasetSource {
  /** Human-readable source name, e.g. "FRED". */
  name: string;
  index?: TakoSourceIndex;
}

export type TakoDatasetCell = string | number | boolean | null;

/** Exact retrieved rows as positional arrays in `columns` order. */
export interface TakoDataset {
  columns: TakoDatasetColumn[];
  rows: TakoDatasetCell[][];
  total_rows: number;
  truncated: boolean;
  /** Source URL the dataset was derived from. */
  ref: string;
  sources: TakoDatasetSource[];
  provenance?: "query" | "web_extraction";
}

/**
 * Rate card for a card export, so cost can be computed before fetching:
 * `baseline_usd + row_cpm_usd * max(0, rows - free_rows) / 1000`.
 */
export interface TakoExportPricing {
  baseline_usd: number;
  row_cpm_usd: number;
  free_rows: number;
  max_rows_ceiling: number;
}

/** Per-column metadata; entry i describes column i. */
export interface TakoColumnDescriptor {
  name?: string | null;
  metric?: string | null;
  entity?: string | null;
  unit?: string | null;
  dtype?: TakoDatasetColumnType | null;
}

/**
 * Describes the downloadable content behind a result.
 *
 * Exactly one payload group is populated once contents are delivered: `data`
 * (CSV or web text), `records` (verbose JSON), `dataset` (compact), or
 * `url` + `expires_at` (presigned download). When every payload field is unset
 * this is just a price quote.
 *
 * `content_format` distinguishes a web page's extracted text from a card's
 * tabular data, but it is optional as well as nullable — web text may arrive as
 * either `null` or an absent key. Test it loosely (`content_format == null`),
 * never with `=== null`.
 */
export interface TakoResultContent {
  content_format?: TakoContentFormat | null;
  /** USD price of this item. On search/answer cards this is a prospective /contents quote. */
  cost?: number;
  /** Inline payload as text: CSV card data, or a web page's extracted text. */
  data?: string | null;
  /** Inline card data as row objects keyed by column name ("json_records"). */
  records?: Record<string, TakoDatasetCell>[] | null;
  /** Inline card data as a compact dataset ("json_compact"). */
  dataset?: TakoDataset | null;
  /** Presigned download URL ("url" delivery mode). */
  url?: string | null;
  expires_at?: string | null;
  /** True total rows in the card's data, independent of how many were returned. */
  total_rows?: number | null;
  truncated?: boolean;
  export_pricing?: TakoExportPricing | null;
  manifest?: TakoColumnDescriptor[] | null;
}

export interface TakoContentItem extends TakoResultContent {
  /** The originating result URL from the request. */
  source_url: string;
}

// ----- Cards and web results -----

export interface TakoCardSource {
  source_name?: string | null;
  source_description?: string | null;
  source_index: TakoSourceIndex;
  url?: string | null;
  /** Raw excerpts from the source page. Present for web sources; null for data. */
  source_text?: string | null;
}

/** @deprecated Renamed to {@link TakoCardSource}. */
export type TakoKnowledgeCardSource = TakoCardSource;

/** Both keys are always present on the wire, though either value may be null. */
export interface TakoKnowledgeCardMethodology {
  methodology_name: string | null;
  methodology_description: string | null;
}

/** Graph node (entity or metric) behind a card. */
export interface TakoCardNode {
  /** Opaque public id (`ent::…` / `mt::…`). Not durable across graph rebuilds. */
  id: string;
  type: TakoGraphNodeType;
  name: string;
  description?: string | null;
}

export interface TakoMetricDefinition {
  name: string;
  definition: string;
}

/** Freshness dates for a card's data. */
export interface TakoDataFreshness {
  /** Coverage date of the data. */
  data_as_of?: string | null;
  /** Date the data was last refreshed. */
  last_updated?: string | null;
}

export interface TakoCard {
  card_id?: string | null;
  title?: string | null;
  description?: string | null;
  semantic_description?: string | null;
  webpage_url?: string | null;
  image_url?: string | null;
  embed_url?: string | null;
  sources?: TakoCardSource[] | null;
  methodologies?: TakoKnowledgeCardMethodology[] | null;
  source_indexes?: TakoSourceIndex[] | null;
  card_type?: string | null;
  relevance?: TakoKnowledgeCardRelevance | null;
  content?: TakoResultContent | null;
  /**
   * Whether /contents can download this card's data. `false` means the export is
   * unavailable — don't call takoContents on it. `true` is eligible but not
   * guaranteed (a 403 is still possible), so fall back to the inline preview.
   */
  exportable?: boolean;
  /** Relevance on a 1.0–5.0 scale. Only populated for entitled accounts. */
  relevance_score?: number | null;
  /** Graph nodes behind this card. Absent for web-only cards. */
  nodes?: TakoCardNode[] | null;
  metric_definitions?: TakoMetricDefinition[] | null;
  data_freshness?: TakoDataFreshness | null;
}

export interface TakoWebResult {
  title: string;
  url: string;
  /** Excerpt(s) from the page that matched the query. */
  snippet?: string | null;
  source_name?: string | null;
  publish_date?: string | null;
  content?: TakoResultContent | null;
  /** 1-based citation number for inline [N] markers. Null on raw retrieval. */
  citation_number?: number | null;
}

// ----- Wire responses (exactly what the API sends) -----

/**
 * The raw `POST /api/v3/search` body. Only `request_id` is guaranteed; the
 * collections are absent rather than empty when there is nothing to report.
 * Tools return the normalized {@link TakoSearchResult} instead.
 */
export interface TakoSearchResponse {
  cards?: TakoCard[];
  web_results?: TakoWebResult[];
  request_id: string;
  usage?: TakoUsage | null;
}

/** The raw `POST /api/v1/answer` body. */
export interface TakoAnswerResponse {
  answer: string;
  cards?: TakoCard[];
  web_results?: TakoWebResult[];
  request_id: string;
  usage?: TakoUsage | null;
}

/** The raw `POST /api/v1/contents` body. */
export interface TakoContentsResponse {
  contents?: TakoContentItem[];
  request_id: string;
  usage?: TakoUsage | null;
}

// ----- Tool results (normalized: collections always present) -----

export interface TakoSearchResult {
  cards: TakoCard[];
  web_results: TakoWebResult[];
  request_id: string;
  usage?: TakoUsage | null;
}

export interface TakoAnswerResult {
  /** Synthesized text answer. */
  answer: string;
  /** Backing cards; cards[0] is the lead card. */
  cards: TakoCard[];
  web_results: TakoWebResult[];
  request_id: string;
  usage?: TakoUsage | null;
}

export interface TakoContentsResult {
  contents: TakoContentItem[];
  request_id: string;
  usage?: TakoUsage | null;
}
