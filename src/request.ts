import type { AnswerRequest, ContentsRequest, SearchRequest } from "tako-sdk";
import type {
  TakoAnswerConfig,
  TakoAnswerResponse,
  TakoAnswerResult,
  TakoContentsConfig,
  TakoContentsResponse,
  TakoContentsResult,
  TakoRetrievalConfig,
  TakoSearchResponse,
  TakoSearchResult,
} from "./types";

const DEFAULT_BASE_URL = "https://tako.com";

export function resolveApiKey(config: { apiKey?: string }): string | undefined {
  return config.apiKey ?? process.env.TAKO_API_KEY ?? process.env.TAKO_API_TOKEN;
}

export function resolveBaseUrl(config: { baseUrl?: string }): string {
  return (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

// ----- Request builders -----
//
// A config is the API request body plus this package's two connection fields.
// Each builder strips those two — a key in a request body is a leak — and adds
// the field the model supplies. Nothing is renamed, defaulted or validated:
// the API is the authority on every option, so an option Tako adds or a limit
// Tako raises needs no release here. Dates are `Date`s because the generated
// serializer owns their wire form.

export function buildSearchRequestBody(config: TakoRetrievalConfig, query: string): SearchRequest {
  const { apiKey: _apiKey, baseUrl: _baseUrl, ...request } = config;
  return { ...request, query };
}

export function buildAnswerRequestBody(config: TakoAnswerConfig, query: string): AnswerRequest {
  const { apiKey: _apiKey, baseUrl: _baseUrl, ...request } = config;
  return { ...request, query };
}

export function buildContentsRequestBody(url: string, config: TakoContentsConfig): ContentsRequest {
  const { apiKey: _apiKey, baseUrl: _baseUrl, ...request } = config;
  return { ...request, url };
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
