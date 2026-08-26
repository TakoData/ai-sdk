import { describe, expectTypeOf, it } from "vitest";
import type { SearchResponse, TakoCard as SdkTakoCard, TakoDatasetCell as SdkCell } from "tako-sdk";
import type {
  TakoCard,
  TakoContentFormat,
  TakoContentsMode,
  TakoDatasetCell,
  TakoDatasetColumnType,
  TakoGraphNodeType,
  TakoKnowledgeCardRelevance,
  TakoSearchEffort,
  TakoSearchResponse,
  TakoSearchResult,
  TakoSourceIndex,
  TakoWebCategory,
} from "../src/types";

describe("wire types are tako-sdk's, not copies", () => {
  // These assert the alias is wired up. They cannot detect drift: both sides
  // resolve to the same declaration, so an upstream change moves them together
  // and the assertion still passes. The literal pins below are the drift gate.
  it("aliases the generated response and card types", () => {
    expectTypeOf<TakoSearchResponse>().toEqualTypeOf<SearchResponse>();
    expectTypeOf<TakoCard>().toEqualTypeOf<SdkTakoCard>();
    expectTypeOf<TakoDatasetCell>().toEqualTypeOf<SdkCell>();
    expectTypeOf<TakoDatasetCell>().toEqualTypeOf<string | number | boolean | null>();
  });

  it("string literals still satisfy the enum aliases", () => {
    const effort: TakoSearchEffort = "deep";
    expectTypeOf(effort).toMatchTypeOf<TakoSearchEffort>();
  });

  it("normalized results require the collections and keep every other response field", () => {
    expectTypeOf<TakoSearchResult["cards"]>().toEqualTypeOf<TakoCard[]>();
    expectTypeOf<TakoSearchResult["request_id"]>().toEqualTypeOf<string>();
  });

  // Pin every enum's member set as a literal. A member added or removed upstream
  // fails `pnpm typecheck` here, which forces a MIGRATING entry instead of a
  // silent change to this package's public API. `card_json` reached
  // `TakoContentFormat` exactly this way and shipped undocumented, so the cost
  // of not having these pins is measured, not hypothetical.
  it("pins every enum alias member set", () => {
    expectTypeOf<TakoSearchEffort>().toEqualTypeOf<"fast" | "instant" | "deep">();
    expectTypeOf<TakoContentsMode>().toEqualTypeOf<"url" | "inline">();
    expectTypeOf<TakoContentFormat>().toEqualTypeOf<"csv" | "json_records" | "json_compact" | "card_json">();
    expectTypeOf<TakoSourceIndex>().toEqualTypeOf<"data" | "web">();
    expectTypeOf<TakoKnowledgeCardRelevance>().toEqualTypeOf<"High" | "Medium" | "Low">();
    expectTypeOf<TakoGraphNodeType>().toEqualTypeOf<"metric" | "entity">();
    expectTypeOf<TakoDatasetColumnType>().toEqualTypeOf<"string" | "number" | "boolean" | "date" | "datetime">();
    expectTypeOf<TakoWebCategory>().toEqualTypeOf<"news" | "sports" | "finance">();
  });
});
