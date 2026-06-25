import type { TakoRetrievalConfig } from "./types";

const DEFAULT_BASE_URL = "https://trytako.com";

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
    tako?: { count?: number; include_contents?: boolean; defer_data_retrieval?: boolean };
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
    if (config.sources.tako) {
      const tako: NonNullable<NonNullable<SearchRequestBody["sources"]>["tako"]> = {};
      if (config.sources.tako.count !== undefined) tako.count = config.sources.tako.count;
      if (config.sources.tako.includeContents !== undefined) tako.include_contents = config.sources.tako.includeContents;
      if (config.sources.tako.deferDataRetrieval !== undefined) tako.defer_data_retrieval = config.sources.tako.deferDataRetrieval;
      sources.tako = tako;
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
