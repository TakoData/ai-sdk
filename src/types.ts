// ----- Enums / unions (mirror the backend StrEnums) -----

export type TakoSearchEffort = "fast" | "instant" | "deep";
export type TakoContentsMode = "url" | "inline";
export type TakoContentFormat = "csv" | "text";
/** CardSourceIndex on the response surface. */
export type TakoCardSourceIndex = "tako" | "web" | "connected_data" | "tako_deep_v2";
export type TakoKnowledgeCardRelevance = "High" | "Medium" | "Low";

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

export interface TakoCardSourceOptions extends TakoSourceOptions {
  /** Defer data retrieval (faster, less detail). Mutually exclusive with includeContents. */
  deferDataRetrieval?: boolean;
}

export interface TakoRetrievalConfig extends TakoBaseConfig {
  /** "fast" (default) | "instant" | "deep". */
  effort?: TakoSearchEffort;
  /** Per-source settings. A source is searched iff its key is present. Omit to search tako + web. */
  sources?: { tako?: TakoCardSourceOptions; web?: TakoSourceOptions };
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

// ----- Response types (mirror the API wire shape, snake_case) -----

export interface TakoResultContent {
  format: TakoContentFormat;
  cost: number;
  data?: string | null;
  total_rows?: number | null;
  truncated?: boolean;
}

export interface TakoCardSourceIndexSegment {
  index_type: TakoCardSourceIndex;
  segment_id: string;
}

export interface TakoCardSourcePrivateIndex {
  index_type: TakoCardSourceIndex;
  private_index_id: string;
  /** Optional for private indexes. */
  segment_id?: string | null;
}

export interface TakoKnowledgeCardSource {
  source_name: string | null;
  source_description: string | null;
  source_index: TakoCardSourceIndex | TakoCardSourceIndexSegment | TakoCardSourcePrivateIndex;
  url: string | null;
  source_text?: string | null;
}

export interface TakoKnowledgeCardMethodology {
  methodology_name: string | null;
  methodology_description: string | null;
}

export interface TakoCard {
  card_id?: string | null;
  title?: string | null;
  description?: string | null;
  semantic_description?: string | null;
  webpage_url?: string | null;
  image_url?: string | null;
  embed_url?: string | null;
  sources?: TakoKnowledgeCardSource[] | null;
  methodologies?: TakoKnowledgeCardMethodology[] | null;
  source_indexes?: (TakoCardSourceIndex | TakoCardSourceIndexSegment)[] | null;
  card_type?: string | null;
  relevance?: TakoKnowledgeCardRelevance | null;
  content?: TakoResultContent | null;
}

export interface TakoWebResult {
  title: string;
  url: string;
  snippet?: string | null;
  source_name?: string | null;
  publish_date?: string | null;
  content?: TakoResultContent | null;
  citation_number?: number | null;
}

export interface TakoContentItem extends TakoResultContent {
  source_url: string;
  url?: string | null;
  expires_at?: string | null;
}

export interface TakoSearchResult {
  cards: TakoCard[];
  web_results: TakoWebResult[];
  contents_total_cost: number;
  request_id: string;
}

export interface TakoAnswerResult {
  /** Synthesized text answer. */
  answer: string;
  /** Backing cards; cards[0] is the lead card. */
  cards: TakoCard[];
  web_results: TakoWebResult[];
  contents_total_cost: number;
  request_id: string;
}

export interface TakoContentsResult {
  contents: TakoContentItem[];
  request_id: string;
}
