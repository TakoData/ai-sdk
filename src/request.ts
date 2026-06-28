import type { TakoRetrievalConfig } from "./types";

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
    data?: { count?: number; include_contents?: boolean; defer_data_retrieval?: boolean };
    web?: { count?: number; include_contents?: boolean };
  };
  timezone?: string;
  output_settings?: { image_dark_mode?: boolean; force_refresh?: boolean };
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
      if (dataSource.deferDataRetrieval !== undefined) data.defer_data_retrieval = dataSource.deferDataRetrieval;
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
