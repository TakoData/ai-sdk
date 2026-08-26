import { describe, expectTypeOf, it } from "vitest";
import type {
  AnswerRequest,
  ContentsRequest,
  DataSourceSettings,
  SearchRequest,
  Sources,
  WebSourceSettings,
} from "tako-sdk";
import type {
  TakoAnswerConfig,
  TakoContentsConfig,
  TakoDataSourceOptions,
  TakoRetrievalConfig,
  TakoSources,
  TakoWebSourceOptions,
} from "../src/types";

// Every assertion here is a type. `pnpm test` runs the file and passes; only
// `pnpm typecheck` can fail it. That is the point: a config key the SDK adds
// or drops changes this package's public type, and this file is where that
// change becomes visible instead of silent.

type OmittedDataKeys = Exclude<keyof DataSourceSettings, keyof TakoDataSourceOptions>;
type UnreachableSources = Exclude<keyof Sources, keyof TakoSources>;

describe("config types are tako-sdk's request types", () => {
  it("omits exactly mode, node_ids and strict from the data source, and nothing else", () => {
    // Fails if tako-sdk drops one of the three (the Omit list must shrink) or
    // if someone omits a fourth key here without a design note.
    expectTypeOf<OmittedDataKeys>().toEqualTypeOf<"mode" | "node_ids" | "strict">();
  });

  it("exposes every other request key, including the three 4.0 never mapped", () => {
    expectTypeOf<TakoRetrievalConfig["include_related"]>().toEqualTypeOf<SearchRequest["include_related"]>();
    expectTypeOf<TakoDataSourceOptions["max_rows"]>().toEqualTypeOf<DataSourceSettings["max_rows"]>();
    expectTypeOf<TakoWebSourceOptions["highlights"]>().toEqualTypeOf<WebSourceSettings["highlights"]>();
    expectTypeOf<TakoWebSourceOptions>().toEqualTypeOf<WebSourceSettings>();
    // Every source Tako declares is reachable. This is the pin the `keyof
    // SearchRequest` lines below cannot be: they compare top-level key names,
    // and `sources` is present either way, so they say nothing about what is
    // inside it. A hand-written `{ data, web }` pair would fail here — and only
    // here — once Tako adds a third source.
    expectTypeOf<UnreachableSources>().toEqualTypeOf<never>();
    // Every SDK key is a config key.
    expectTypeOf<Exclude<keyof SearchRequest, "query">>().toMatchTypeOf<keyof TakoRetrievalConfig>();
    expectTypeOf<Exclude<keyof AnswerRequest, "query">>().toMatchTypeOf<keyof TakoAnswerConfig>();
    expectTypeOf<Exclude<keyof ContentsRequest, "url">>().toMatchTypeOf<keyof TakoContentsConfig>();
  });

  it("gives the answer tool output_schema, and keeps a search config assignable to it", () => {
    expectTypeOf<TakoAnswerConfig["output_schema"]>().toEqualTypeOf<AnswerRequest["output_schema"]>();
    expectTypeOf<TakoRetrievalConfig>().toMatchTypeOf<TakoAnswerConfig>();
    // @ts-expect-error output_schema is an answer option; search has no synthesis to shape.
    const search: TakoRetrievalConfig = { output_schema: { type: "object" } };
    void search;
  });

  it("rejects the omitted keys at compile time", () => {
    // @ts-expect-error mode has no effect on Tako cards; see the design spec.
    const mode: TakoRetrievalConfig = { sources: { data: { mode: "url" } } };
    // @ts-expect-error node_ids come from graph endpoints this package does not wrap.
    const nodeIds: TakoRetrievalConfig = { sources: { data: { node_ids: ["x"] } } };
    // @ts-expect-error strict is meaningless without node_ids.
    const strict: TakoRetrievalConfig = { sources: { data: { strict: true } } };
    void mode;
    void nodeIds;
    void strict;
  });

  it("keeps the connection fields out of the request types", () => {
    expectTypeOf<"apiKey">().not.toMatchTypeOf<keyof SearchRequest>();
    expectTypeOf<"baseUrl">().not.toMatchTypeOf<keyof SearchRequest>();
    expectTypeOf<TakoContentsConfig["apiKey"]>().toEqualTypeOf<string | undefined>();
  });
});
