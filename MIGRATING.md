# Migrating

## 3.x → 4.0

4.0 replaces this package's hand-written copy of Tako's wire types with the
types from [`tako-sdk`](https://www.npmjs.com/package/tako-sdk), Tako's client
generated from the OpenAPI spec, and calls the API through that client. The
response type names are unchanged. **The config changed shape**, and that is
the edit most 3.x code needs:

### Config keys are the API's own names

Every config key is now the snake_case name the API uses, and the two date
fields take a `Date`. `TakoRetrievalConfig` is `SearchRequest` without `query`;
`TakoContentsConfig` is `ContentsRequest` without `url`. The rule is mechanical:

```ts
// 3.x
takoSearch({
  countryCode: "US",
  sources: { data: { count: 10, includeContents: true }, web: { publishedAfter: "2026-01-01" } },
  outputSettings: { imageDarkMode: true },
});

// 4.0
takoSearch({
  country_code: "US",
  sources: { data: { count: 10, include_contents: true }, web: { published_after: new Date("2026-01-01") } },
  output_settings: { image_dark_mode: true },
});
```

Build dates with the ISO-string constructor, as shown. A local-time `Date` in
a UTC+ timezone serializes as the previous day.

Rename the key and convert the value. 3.x took `publishedAfter` as a string, so
renaming the key and passing the old string through rejects the tool call with
`value.published_after.toISOString is not a function` — the most likely failure
of this migration, and the one TypeScript catches for you. Nothing validates
the value either: an `Invalid Date` rejects with `Invalid time value`, naming no
field. Both errors reach the model rather than you, and 3.x's
`publishedAfter must be an ISO date` error is gone with the string form.

Three options are gone from `sources.data`, with no replacement in this
package: `mode`, which the API documents as having no effect on Tako cards;
and `nodeIds` with `strict`, which take graph ids from endpoints this package
doesn't wrap. To pin nodes, call `POST /api/v3/search` through `tako-sdk`
directly. The construction-time throw for `strict` without `nodeIds` is gone
with the options.

Removed aliases: `sources.tako` (use `sources.data`), `TakoCardSourceOptions`
(use `TakoDataSourceOptions`), `TakoKnowledgeCardSource` (use
`TakoCardSource`), `TakoCardSourceIndex` (use `TakoSourceIndex`),
`TakoSourceOptions` and `TakoGeoLocation` (both were config-only helpers with
no SDK counterpart).

New: `takoAnswer` takes `TakoAnswerConfig`, which adds `output_schema` for
structured output, and every option `tako-sdk` declares is reachable —
including `include_related`, `sources.data.max_rows` and
`sources.web.highlights`, which 3.x had no key for.

### Runtime and response changes

Three things changed underneath:

| 3.x | 4.0 |
| --- | --- |
| Response JSON passed through untouched; an undeclared field was present at runtime | The generated decoders copy declared fields only. A field appears once `tako-sdk` knows it — usually within a day of the API change |
| Zero runtime dependencies | `tako-sdk` is a dependency (`^1.4.0`). It uses the global `fetch` |
| `TakoCard` and friends declared here | Aliases of `tako-sdk`'s types. If you also depend on `tako-sdk`, make sure both resolve to the same major, or TypeScript sees two `TakoCard`s |

Two decoded values changed shape:

- `content_format` on a contents item is `undefined` where 3.x gave you `null`.
  The generated decoder maps `null` and an absent key to the same thing, so
  branch with `== null`, never `=== null`.
- `citation_number` on a web result is gone. The spec 3.x vendored declared it,
  but the public `WebResult` no longer does, and neither retrieval surface ever
  filled one. Drop the branch that reads it.

Two types changed shape, and both break at compile time rather than silently:

- **`TakoExportPricing.free_rows` is optional, and always 0.** Row allowances
  are gone — an account that pays nothing per row reports `row_cpm_usd` of 0
  instead. The 3.x cost formula stops compiling with `TS18048`, because
  `free_rows` can now be `undefined`. Drop the term: the cost is
  `baseline_usd + row_cpm_usd * rows / 1000`, where `rows` is every row the
  export returns. `row_cpm_usd` changed meaning to match — in 3.x it priced
  only the rows above the allowance.
- **`TakoContentFormat` gained a fourth member, `"card_json"`.** Pass it as
  `content_format` to get a card's structured payload. An exhaustive `switch`
  over the old three members stops compiling; add a case or a `default`.

One runtime behavior changed with them:

- **A tool resolves `TAKO_API_KEY` once, on its first call.** 3.x read the key
  on every call, so a key rotated in `process.env` took effect on the next one.
  4.0 builds the generated client once per tool and keeps it. To rotate a key
  in-process, construct a new tool.

Six response fields appeared upstream and need no edit to read: `related` on a
search response, `structured_output` and `structured_output_error` on an answer
response, `card_data` and `card_data_schema` on a result content, and
`coverage_end` on data freshness.

If you read a response field that isn't in the Tako OpenAPI spec, it's gone.
Nothing else needs an edit. To use the un-aliased names, import them from
`tako-sdk` directly:

```ts
import type { SearchResponse } from "tako-sdk";   // same type as TakoSearchResponse
```

## 2.x → 3.0

3.0 realigns this SDK's types with the current Tako API, and opens up the request options 2.x could not reach. Every **change** below is a case where 2.x described something the API no longer does — so if code depended on it, it was already broken at runtime, whatever TypeScript said. The **New options** section at the end is purely additive: nothing there requires an edit to working 2.x code.

At the time, `tests/contract/` validated these types against a vendored copy of Tako's OpenAPI document and against [`tako-sdk`](https://www.npmjs.com/package/tako-sdk), Tako's official generated client. Both were pinned snapshots, refreshed deliberately rather than continuously. 4.0 deleted that suite along with the hand-written types it guarded — see [3.x → 4.0](#3x--40).

### Config

| 2.x | 3.0 |
| --- | --- |
| `sources.data.deferDataRetrieval` | **Removed.** No replacement. |

The API removed `defer_data_retrieval` from its data-source settings, and those settings forbid unknown properties — so any request that set this option was **rejected outright**, not silently ignored. Delete the option; the request starts working.

### Responses

| 2.x | 3.0 |
| --- | --- |
| `result.contents_total_cost: number` | **No replacement.** Read per-item `content.cost` / `content.export_pricing` (see below) |
| `content.format` | `content.content_format` |
| `TakoContentFormat = 'csv' \| 'text'` | `'csv' \| 'json_records' \| 'json_compact'` |

**Cost.** `contents_total_cost` no longer exists — confirmed absent from every live response. The spec defines `usage` as its successor, but **the API does not currently populate `usage` either**, so there is no drop-in replacement for an aggregate request cost:

```ts
// 2.x
const cost = result.contents_total_cost;          // undefined at runtime

// 3.0 — typed, but currently always undefined in practice
const cost = result.usage?.total_cost_usd;

// 3.0 — where pricing actually lives today: per item
for (const card of result.cards) {
  card.content?.cost;            // USD, e.g. 0.001
  card.content?.export_pricing;  // rate card for a full /contents export
}
```

Verified 2026-08 across plain, `deep` and `includeContents` search, answer, and both contents modes: `usage` was absent from every response. It is typed `usage?: TakoUsage | null` so it will light up if Tako starts emitting it, but do not build cost tracking on it yet. Sum the per-item `cost` fields instead.

**Content format.** The field was renamed *and* its values changed. `'text'` is gone: web page text is signalled by the absence of a format. The field is optional as well as nullable, so it may arrive as `null` **or** be missing entirely — test it loosely with `== null`, never `=== null`.

```ts
// 2.x
if (item.format === 'csv') parseCsv(item.data);
else if (item.format === 'text') readProse(item.data);   // both branches dead

// 3.0
if (item.content_format == null) readProse(item.data);   // web page text
else parseCsv(item.data);                                // card data
```

Three payload fields were also missing and are now typed: `records` (for `json_records`), `dataset` (for `json_compact`), plus `export_pricing` and `manifest`.

### Source taxonomy

| 2.x | 3.0 |
| --- | --- |
| `TakoCardSourceIndex = 'tako' \| 'web' \| 'connected_data' \| 'tako_deep_v2'` | `TakoSourceIndex = 'data' \| 'web'` |
| `TakoCardSourceIndexSegment` | **Removed** — never existed in the API |
| `TakoCardSourcePrivateIndex` | **Removed** — never existed in the API |
| `TakoKnowledgeCardSource` | `TakoCardSource` (the alias was kept in 3.0 and removed in 4.0) |

The curated Tako source is `'data'`, not `'tako'`. This one fails silently, so it's worth grepping for:

```ts
if (src.source_index === 'tako')   // never matches — compiles fine, never runs
if (src.source_index === 'data')   // correct
```

`source_index` is now the required two-member union `'data' | 'web'`. 2.x modelled it as a union that could also be an object (`{ index_type, segment_id }`), which the API has never sent on this surface — any code narrowing on that shape can be deleted.

### Guaranteed collections

The API guarantees only `request_id` (plus `answer` on the answer surface); the collections are not in its `required` list, so a valid response may omit them. In practice the API currently does send `cards: []` on a web-only search, so 2.x's always-present typing was a latent hazard rather than an active crash — but the contract permits omission, and `tako-sdk` decodes an absent collection to `undefined`.

3.0 keeps them non-optional **and makes it true**: the tools normalize absent collections to `[]` before returning. No caller changes needed, and no `?.` required.

If you want the unnormalized wire shape, import `TakoSearchResponse`, `TakoAnswerResponse` or `TakoContentsResponse`.

### New card fields

`TakoCard` gained five fields the API was already sending:

- **`exportable`** — whether `takoContents` can download this card's data. `false` means the call returns 403, so skip it. `true` is eligibility, not a guarantee.
- **`data_freshness`** — `{ data_as_of, last_updated }`.
- **`relevance_score`** — 1.0–5.0, populated for entitled accounts.
- **`nodes`** — the graph entities and metrics behind the card.
- **`metric_definitions`** — definitions of the metrics displayed.

`exportable` is the practical one; filtering on it avoids calls that cannot succeed:

```ts
const downloadable = result.cards.filter((c) => c.exportable);
```

### New options

3.0 adds 16 request options that 2.x could not reach, and covered every property the API's request schemas defined at the time; a contract suite asserted that, and 4.0 replaced it by deriving the config from `tako-sdk` instead. Every option is optional, so no working 2.x call needs editing. The [README](./README.md#configuration) describes the config; this section covers only what a 2.x reader would otherwise get wrong.

**One rename to be aware of.** `TakoCardSourceOptions` is now `TakoDataSourceOptions`, because the data and web sources no longer take the same fields. 3.0 kept the old name as a deprecated alias; 4.0 removed it. The two were never interchangeable after this split, and code that passed one options object to both `sources.data` and `sources.web` will not type-check against the per-source fields 3.0 added.

**`content_format` is now two different things.** The response field renamed from `format` (see **Content format** above) is what the API *sends*. There is also now a `contentFormat` **request** option that chooses it. Same concept, opposite direction:

```ts
// Ask for a format...
takoContents({ contentFormat: "json_records" });          // explicit fetch
takoSearch({ sources: { data: { contentFormat: "csv" } } }); // card inlined by a search

// ...and read which one arrived.
if (item.content_format == null) readProse(item.data);
```

The defaults differ by surface: `json_compact` on `sources.data`, `csv` on `takoContents`. That is the API's behaviour, not a choice this SDK makes.

**Three options carry consequences worth reading before you set them.**

- **`maxRows`** — the fix for the 1000-row documentation error in the **Content format** notes. Every row returned bills at the per-1,000-row rate; there's no free allowance. A value over the 2,000-row ceiling is **clamped, not rejected**, and you are billed for what comes back — so an over-large value yields a short export, a charge, and no error. Check `total_rows` and `truncated`.
- **`quoteOnly`** — prices an export without fetching or charging. Use it to find the cost before committing. The item's `url` and payload come back null, and the API ignores `mode` and `contentFormat` on a quote.
- **`strict`** — returns only cards matching a pinned node, so it requires a non-empty `nodeIds`. In 3.0, setting one without the other threw from `takoSearch()`/`takoAnswer()` at construction rather than failing the request. Node ids come from the `/v1/graph` endpoints, which this SDK does not wrap. 4.0 removed both options and that throw with them.

**One option is accepted but inert.** `sources.data.mode` is in the API's schema and the API documents it as having no effect on Tako cards. 3.0 exposed it for completeness; 4.0 stopped exposing it, because setting it changes nothing.

This SDK does not check numeric ranges — the API owns them, so a limit Tako raises works without an SDK release.

### Also corrected

`TakoKnowledgeCardMethodology.methodology_name` and `.methodology_description` are required keys with nullable values (`string | null`), not optional — matching the spec.

Documentation fixes: 2.x claimed inline contents were "capped at 1000 rows". The real behaviour is a 20-row default against a 2,000-row ceiling. Raise it with `maxRows` (see **New options** below).
