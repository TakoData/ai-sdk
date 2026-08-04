export { takoSearch } from "./tools/search";
export { takoAnswer } from "./tools/answer";
export { takoContents } from "./tools/contents";

export type {
  // Config
  TakoBaseConfig,
  TakoRetrievalConfig,
  TakoContentsConfig,
  TakoSourceOptions,
  TakoCardSourceOptions,
  TakoDataSourceOptions,
  TakoWebSourceOptions,
  TakoGeoLocation,
  // Enums / unions
  TakoSearchEffort,
  TakoContentsMode,
  TakoContentFormat,
  TakoSourceIndex,
  TakoCardSourceIndex,
  TakoKnowledgeCardRelevance,
  TakoGraphNodeType,
  TakoDatasetColumnType,
  TakoWebCategory,
  // Usage
  TakoUsage,
  TakoUsageCompute,
  TakoUsageData,
  // Content payloads
  TakoResultContent,
  TakoContentItem,
  TakoDataset,
  TakoDatasetCell,
  TakoDatasetColumn,
  TakoDatasetSource,
  TakoExportPricing,
  TakoColumnDescriptor,
  // Cards and web results
  TakoCard,
  TakoCardSource,
  TakoKnowledgeCardSource,
  TakoKnowledgeCardMethodology,
  TakoCardNode,
  TakoMetricDefinition,
  TakoDataFreshness,
  TakoWebResult,
  // Wire responses (what the API sends; only request_id is guaranteed)
  TakoSearchResponse,
  TakoAnswerResponse,
  TakoContentsResponse,
  // Tool results (normalized: collections always present)
  TakoSearchResult,
  TakoAnswerResult,
  TakoContentsResult,
} from "./types";
