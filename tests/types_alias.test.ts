import { describe, expectTypeOf, it } from "vitest";
import type { SearchResponse, TakoCard as SdkTakoCard, TakoDatasetCell as SdkCell } from "tako-sdk";
import type {
  TakoCard,
  TakoDatasetCell,
  TakoSearchEffort,
  TakoSearchResponse,
  TakoSearchResult,
} from "../src/types";

describe("wire types are tako-sdk's, not copies", () => {
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
});
