/**
 * Type-level conformance between this SDK's public types and `tako-sdk`, Tako's
 * official client generated from the published OpenAPI document.
 *
 * This file is deliberately NOT part of `pnpm typecheck`. It is compiled by
 * `types.conformance.test.ts`, which asserts it compiles clean. Every
 * assignment below is a question:
 *
 *   "Can this SDK's declared type actually hold what the API sends?"
 *
 * A clean compile means yes. Any error is a real runtime hazard: a field the
 * SDK promises TypeScript will be there, which the API does not send.
 *
 * The `Tako*Response` types are the wire shapes and must match the official
 * client field for field. The `Tako*Result` types are what the tools return
 * after normalization, so they are checked in the other direction: whatever the
 * SDK guarantees must be a shape the API could actually have produced.
 */
import type {
  ContentItem as OfficialContentItem,
  ContentsFormat as OfficialContentsFormat,
  ResultContent as OfficialResultContent,
  SearchResponse as OfficialSearchResponse,
  AnswerResponse as OfficialAnswerResponse,
  ContentsResponse as OfficialContentsResponse,
  TakoCard as OfficialTakoCard,
  TakoDataset as OfficialTakoDataset,
  WebResult as OfficialWebResult,
  TakoSourceIndex as OfficialTakoSourceIndex,
} from "tako-sdk";
import type {
  TakoAnswerResponse,
  TakoAnswerResult,
  TakoCard,
  TakoContentFormat,
  TakoContentItem,
  TakoContentsResponse,
  TakoContentsResult,
  TakoSearchResponse,
  TakoSearchResult,
  TakoSourceIndex,
} from "../../src/types";

/**
 * One documented deviation from the official client.
 *
 * The spec types dataset cells and `records` values as
 * `anyOf [string, number, integer, boolean, null]`, but the OpenAPI generator
 * renders that union as an empty interface (`RowsInnerInner {}`), which admits
 * objects and rejects null — strictly less precise than the spec.
 * `TakoDatasetCell` follows the spec instead, so the official type is patched at
 * that one leaf rather than degrading ours. `response.contract.test.ts` pins the
 * spec's actual union so this stays evidence-based.
 *
 * Everything outside these two fields is compared strictly.
 */
type Cell = string | number | boolean | null;
type FixedDataset = Omit<OfficialTakoDataset, "rows"> & { rows: Cell[][] };
type FixedContent = Omit<OfficialResultContent, "records" | "dataset"> & {
  records?: Record<string, Cell>[] | null;
  dataset?: FixedDataset | null;
};
type WithFixedContent<T> = Omit<T, "content"> & { content?: FixedContent | null };
type FixedCard = WithFixedContent<OfficialTakoCard>;
type FixedWebResult = WithFixedContent<OfficialWebResult>;
type WithFixedCollections<T> = Omit<T, "cards" | "web_results"> & {
  cards?: FixedCard[];
  web_results?: FixedWebResult[];
};

declare const officialSearch: WithFixedCollections<OfficialSearchResponse>;
declare const officialAnswer: WithFixedCollections<OfficialAnswerResponse>;
declare const officialContents: Omit<OfficialContentsResponse, "contents"> & {
  contents?: (Omit<OfficialContentItem, "records" | "dataset"> & FixedContent)[];
};
declare const officialContentItem: Omit<OfficialContentItem, "records" | "dataset"> & FixedContent;
declare const officialCard: FixedCard;
declare const officialSourceIndex: OfficialTakoSourceIndex;
declare const officialFormat: OfficialContentsFormat;

// --- Wire types: must accept exactly what the API sends ---

export const search: TakoSearchResponse = officialSearch;
export const answer: TakoAnswerResponse = officialAnswer;
export const contents: TakoContentsResponse = officialContents;
export const contentItem: TakoContentItem = officialContentItem;
export const card: TakoCard = officialCard;

// --- Enums: must agree in both directions ---

export const format: TakoContentFormat = officialFormat;
export const formatBack: OfficialContentsFormat = null as unknown as TakoContentFormat;
export const sourceIndex: TakoSourceIndex = officialSourceIndex;
export const sourceIndexBack: OfficialTakoSourceIndex = null as unknown as TakoSourceIndex;

// --- Result types: the normalized shapes the tools return ---
//
// Checked the other way round. Normalization only fills in absent collections,
// so every result must still be a valid wire response — that proves the
// normalizer adds guarantees without inventing fields.

declare const searchResult: TakoSearchResult;
declare const answerResult: TakoAnswerResult;
declare const contentsResult: TakoContentsResult;

export const searchResultIsWireValid: WithFixedCollections<OfficialSearchResponse> = searchResult;
export const answerResultIsWireValid: WithFixedCollections<OfficialAnswerResponse> = answerResult;
export const contentsResultIsWireValid: typeof officialContents = contentsResult;
