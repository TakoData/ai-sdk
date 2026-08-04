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
  SearchEffortLevel as OfficialSearchEffortLevel,
  ContentsDeliveryMode as OfficialContentsDeliveryMode,
  WebCategory as OfficialWebCategory,
  // Nested mirrored types — gated for key symmetry below.
  ColumnDescriptor as OfficialColumnDescriptor,
  DataFreshness as OfficialDataFreshness,
  ExportPricing as OfficialExportPricing,
  KnowledgeCardMethodology as OfficialKnowledgeCardMethodology,
  MetricDefinition as OfficialMetricDefinition,
  TakoCardNode as OfficialTakoCardNode,
  TakoCardSource as OfficialTakoCardSource,
  TakoDatasetColumn as OfficialTakoDatasetColumn,
  TakoDatasetSource as OfficialTakoDatasetSource,
  Usage as OfficialUsage,
  UsageCompute as OfficialUsageCompute,
  UsageData as OfficialUsageData,
} from "tako-sdk";
import type {
  TakoAnswerResponse,
  TakoAnswerResult,
  TakoCard,
  TakoCardNode,
  TakoCardSource,
  TakoColumnDescriptor,
  TakoContentFormat,
  TakoContentItem,
  TakoContentsMode,
  TakoContentsResponse,
  TakoContentsResult,
  TakoDataFreshness,
  TakoDataset,
  TakoDatasetColumn,
  TakoDatasetSource,
  TakoExportPricing,
  TakoKnowledgeCardMethodology,
  TakoMetricDefinition,
  TakoResultContent,
  TakoSearchEffort,
  TakoSearchResponse,
  TakoSearchResult,
  TakoSourceIndex,
  TakoUsage,
  TakoUsageCompute,
  TakoUsageData,
  TakoWebCategory,
  TakoWebResult,
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

// Request-side enums. A stale member here is not a parse bug — it compiles, and
// the API rejects the whole request. `request.contract.test.ts` does not reach
// them: it validates one effort value and iterates hand-written mode literals,
// so neither enumerates what the union declares.
export const effort: TakoSearchEffort = null as unknown as OfficialSearchEffortLevel;
export const effortBack: OfficialSearchEffortLevel = null as unknown as TakoSearchEffort;
export const contentsMode: TakoContentsMode = null as unknown as OfficialContentsDeliveryMode;
export const contentsModeBack: OfficialContentsDeliveryMode = null as unknown as TakoContentsMode;
export const webCategory: TakoWebCategory = null as unknown as OfficialWebCategory;
export const webCategoryBack: OfficialWebCategory = null as unknown as TakoWebCategory;

// --- Key symmetry ---
//
// The assignments above prove our types are not over-strict, but they cannot
// catch drift by a whole key in either direction: an optional key we declare and
// the API does not send is still assignable, and a key the API sends that we
// omit is simply ignored (no excess-property check applies to a `declare const`).
// Deleting `data_freshness` from TakoCard passed every assignment above.
//
// This compares key sets directly, so both classes fail the compile and the
// error names the offending key. Compared against the unpatched official types:
// only value types were ever patched, never key sets.
type KeyDiff<Ours, Official> =
  | Exclude<keyof Official, keyof Ours>
  | Exclude<keyof Ours, keyof Official>;
type SameKeys<Ours, Official> = [KeyDiff<Ours, Official>] extends [never]
  ? true
  : { KEY_DRIFT: KeyDiff<Ours, Official> };

export const cardKeys: true = true as SameKeys<TakoCard, OfficialTakoCard>;
export const webResultKeys: true = true as SameKeys<TakoWebResult, OfficialWebResult>;
export const resultContentKeys: true = true as SameKeys<TakoResultContent, OfficialResultContent>;
export const contentItemKeys: true = true as SameKeys<TakoContentItem, OfficialContentItem>;
export const datasetKeys: true = true as SameKeys<TakoDataset, OfficialTakoDataset>;
export const searchKeys: true = true as SameKeys<TakoSearchResponse, OfficialSearchResponse>;
export const answerKeys: true = true as SameKeys<TakoAnswerResponse, OfficialAnswerResponse>;
export const contentsKeys: true = true as SameKeys<TakoContentsResponse, OfficialContentsResponse>;

// Nested types need the same gate. Checking only the eight above leaves both
// drift classes live one level down: deleting `last_updated` from
// TakoDataFreshness compiled clean, because `keyof TakoCard` never changes and
// the narrowed nested type stays assignable. That is the P0-6 regression sitting
// directly under the field the check was written to protect.
export const dataFreshnessKeys: true = true as SameKeys<TakoDataFreshness, OfficialDataFreshness>;
export const cardSourceKeys: true = true as SameKeys<TakoCardSource, OfficialTakoCardSource>;
export const cardNodeKeys: true = true as SameKeys<TakoCardNode, OfficialTakoCardNode>;
export const metricDefinitionKeys: true = true as SameKeys<
  TakoMetricDefinition,
  OfficialMetricDefinition
>;
export const methodologyKeys: true = true as SameKeys<
  TakoKnowledgeCardMethodology,
  OfficialKnowledgeCardMethodology
>;
export const usageKeys: true = true as SameKeys<TakoUsage, OfficialUsage>;
export const usageComputeKeys: true = true as SameKeys<TakoUsageCompute, OfficialUsageCompute>;
export const usageDataKeys: true = true as SameKeys<TakoUsageData, OfficialUsageData>;
export const exportPricingKeys: true = true as SameKeys<TakoExportPricing, OfficialExportPricing>;
export const columnDescriptorKeys: true = true as SameKeys<
  TakoColumnDescriptor,
  OfficialColumnDescriptor
>;
export const datasetColumnKeys: true = true as SameKeys<
  TakoDatasetColumn,
  OfficialTakoDatasetColumn
>;
export const datasetSourceKeys: true = true as SameKeys<
  TakoDatasetSource,
  OfficialTakoDatasetSource
>;

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
