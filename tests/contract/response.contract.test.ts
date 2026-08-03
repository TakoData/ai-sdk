import { describe, expect, it } from "vitest";
import {
  ContentItemFromJSON,
  ContentsFormat,
  SearchResponseFromJSON,
  TakoSourceIndex,
} from "tako-sdk";
import { enumOf, propertiesOf, requiredOf, spec } from "./spec";

const schemas: Record<string, any> = spec.components.schemas;

/**
 * Response-side contract, checked against two independent oracles:
 *
 *   1. Tako's vendored OpenAPI document (./openapi.yaml).
 *   2. `tako-sdk`, Tako's official TypeScript client, generated from that
 *      same document and released from the Tako monorepo.
 *
 * When both agree that a field is absent, this SDK's type declaring it is drift.
 * The `tako-sdk` decoders are the sharper oracle: they materialise exactly the
 * fields the model knows, so a field they drop is a field the API stopped
 * sending.
 */

describe("SearchResponse / AnswerResponse — P0-2: usage replaced contents_total_cost", () => {
  it("the spec declares usage and not contents_total_cost", () => {
    expect(propertiesOf("SearchResponse")).toContain("usage");
    expect(propertiesOf("SearchResponse")).not.toContain("contents_total_cost");
    expect(propertiesOf("AnswerResponse")).toContain("usage");
    expect(propertiesOf("AnswerResponse")).not.toContain("contents_total_cost");
  });

  it("the official client drops contents_total_cost and keeps usage", () => {
    const decoded = SearchResponseFromJSON({
      cards: [],
      web_results: [],
      contents_total_cost: 0,
      request_id: "r",
      usage: { total_cost_usd: 0.01, compute: { cost_usd: 0.01 } },
    });
    expect(Object.keys(decoded)).not.toContain("contents_total_cost");
    expect(decoded.usage).toEqual({
      total_cost_usd: 0.01,
      compute: { cost_usd: 0.01 },
      data: undefined,
    });
  });

  it("Usage carries the total plus an additive compute/data breakdown", () => {
    expect(propertiesOf("Usage")).toEqual(["total_cost_usd", "compute", "data"]);
    expect(requiredOf("Usage")).toEqual(["total_cost_usd"]);
  });
});

describe("SearchResponse — P0-5: only request_id is guaranteed", () => {
  it("cards and web_results are optional in the spec", () => {
    expect(requiredOf("SearchResponse")).toEqual(["request_id"]);
  });

  it("the official client leaves cards/web_results undefined when omitted", () => {
    const decoded = SearchResponseFromJSON({ request_id: "r" });
    expect(decoded.request_id).toBe("r");
    expect(decoded.cards).toBeUndefined();
    expect(decoded.web_results).toBeUndefined();
  });

  it("AnswerResponse guarantees answer alongside request_id", () => {
    expect(requiredOf("AnswerResponse")).toEqual(["answer", "request_id"]);
  });
});

describe("ResultContent / ContentItem — P0-3: format became content_format", () => {
  it("the spec names the field content_format, not format", () => {
    for (const schema of ["ResultContent", "ContentItem"]) {
      expect(propertiesOf(schema)).toContain("content_format");
      expect(propertiesOf(schema)).not.toContain("format");
    }
  });

  it("the serialization enum is csv/json_records/json_compact — 'text' is gone", () => {
    expect(enumOf("ContentsFormat")).toEqual(["csv", "json_records", "json_compact"]);
    expect(enumOf("ContentsFormat")).not.toContain("text");
    expect(Object.values(ContentsFormat)).toEqual(["csv", "json_records", "json_compact"]);
  });

  it("the official client drops `format` and materialises content_format", () => {
    const decoded = ContentItemFromJSON({
      source_url: "https://tako.com/card/x",
      format: "csv", // what this SDK's type claims
      content_format: "csv", // what the API actually sends
      cost: 0,
      truncated: false,
    });
    expect(Object.keys(decoded)).not.toContain("format");
    expect(decoded.content_format).toBe("csv");
  });

  it("carries payload and pricing fields this SDK omits entirely", () => {
    const props = propertiesOf("ResultContent");
    expect(props).toContain("records"); // json_records payload
    expect(props).toContain("dataset"); // json_compact payload (TakoDataset)
    expect(props).toContain("export_pricing"); // rate card for a priced export
    expect(props).toContain("manifest"); // per-column metadata
  });
});

describe("TakoCardSource — P0-4: the source index taxonomy collapsed to {data, web}", () => {
  it("the spec enum is exactly data | web", () => {
    expect(enumOf("TakoSourceIndex")).toEqual(["data", "web"]);
    expect(Object.values(TakoSourceIndex)).toEqual(["data", "web"]);
  });

  it("dropped the legacy tako / connected_data / tako_deep_v2 values", () => {
    const values = enumOf("TakoSourceIndex");
    for (const legacy of ["tako", "connected_data", "tako_deep_v2"]) {
      expect(values).not.toContain(legacy);
    }
  });

  it("source_index is a bare enum — there are no segment/private-index object shapes", () => {
    // 2.x exported TakoCardSourceIndexSegment and TakoCardSourcePrivateIndex as
    // public types. Neither ever existed in the API; both were removed in 3.0.
    const names = Object.keys(schemas);
    expect(names).not.toContain("CardSourceIndexSegment");
    expect(names).not.toContain("CardSourcePrivateIndex");
    expect(names).not.toContain("TakoCardSourceIndexSegment");
    expect(names).not.toContain("TakoCardSourcePrivateIndex");

    const sourceIndex = schemas.TakoCardSource.properties.source_index;
    expect(sourceIndex).toEqual({
      $ref: "#/components/schemas/TakoSourceIndex",
      description: "The index of the source",
      examples: ["data", "web"],
    });
  });
});

describe("dataset cells — justifies the one patch in types.conformance.ts", () => {
  // tako-sdk's generator renders these unions as an empty interface
  // (`RowsInnerInner {}`). The spec is unambiguous, so TakoDatasetCell follows
  // the spec and the conformance fixture patches the official type instead.
  const CELL_UNION = [
    { type: "string" },
    { type: "number" },
    { type: "integer" },
    { type: "boolean" },
    { type: "null" },
  ];

  it("dataset rows hold string | number | boolean | null", () => {
    expect(schemas.TakoDataset.properties.rows.items.items.anyOf).toEqual(CELL_UNION);
  });

  it("json_records values hold the same union", () => {
    expect(schemas.ResultContent.properties.records.anyOf[0].items.additionalProperties.anyOf).toEqual(
      CELL_UNION,
    );
  });
});

describe("methodologies — required keys with nullable values", () => {
  it("both fields are required, so the keys are always present", () => {
    expect(requiredOf("KnowledgeCardMethodology")).toEqual([
      "methodology_name",
      "methodology_description",
    ]);
  });
});

describe("TakoCard — P0-6: agent-relevant fields missing from this SDK", () => {
  it("the spec carries exportable, relevance_score, nodes, metric_definitions, data_freshness", () => {
    const props = propertiesOf("TakoCard");
    expect(props).toContain("exportable");
    expect(props).toContain("relevance_score");
    expect(props).toContain("nodes");
    expect(props).toContain("metric_definitions");
    expect(props).toContain("data_freshness");
  });

  it("data_freshness reports coverage and refresh dates", () => {
    expect(propertiesOf("DataFreshness")).toEqual(["data_as_of", "last_updated"]);
  });
});
