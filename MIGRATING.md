# Migrating

## 2.x → 3.0

3.0 realigns this SDK's types with the current Tako API, and opens up the request options 2.x could not reach. Every **change** below is a case where 2.x described something the API no longer does — so if code depended on it, it was already broken at runtime, whatever TypeScript said. The **New options** section at the end is purely additive: nothing there requires an edit to working 2.x code.

`tests/contract/` validates these types against Tako's published OpenAPI document and against [`tako-sdk`](https://www.npmjs.com/package/tako-sdk), Tako's official generated client, so a type that stops matching either one fails CI. Both are pinned snapshots, refreshed deliberately rather than continuously.

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
| `TakoKnowledgeCardSource` | `TakoCardSource` (old name kept as a deprecated alias) |

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

3.0 adds 16 request options that 2.x could not reach, and now covers every property the API's request schemas define — the contract suite asserts that, so an option Tako adds later fails the build rather than going quietly missing. Every option is optional, so no working 2.x call needs editing. The full tables live in the [README](./README.md#search-and-answer-options); this section covers only what a 2.x reader would otherwise get wrong.

**One rename to be aware of.** `TakoCardSourceOptions` is now `TakoDataSourceOptions`, because the data and web sources no longer take the same fields. The old name still works as a deprecated alias, so nothing breaks — but the two are no longer interchangeable, and code that passed one options object to both `sources.data` and `sources.web` will not type-check against the fields added below.

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

- **`maxRows`** — the fix for the 1000-row documentation error above. The first 20 rows are free; rows beyond that bill at the per-1,000-row rate. A value over the 2,000-row ceiling is **clamped, not rejected**, and you are billed for what comes back — so an over-large value yields a short export, a charge, and no error. Check `total_rows` and `truncated`.
- **`quoteOnly`** — prices an export without fetching or charging. Use it to find the cost before committing. The item's `url` and payload come back null, and the API ignores `mode` and `contentFormat` on a quote.
- **`strict`** — returns only cards matching a pinned node, so it requires a non-empty `nodeIds`. Setting one without the other throws from `takoSearch()`/`takoAnswer()` at construction rather than failing the request. Node ids come from the `/v1/graph` endpoints, which this SDK does not wrap.

**One option is accepted but inert.** `sources.data.mode` is in the API's schema and the API documents it as having no effect on Tako cards. It is exposed for completeness; setting it changes nothing.

This SDK does not check numeric ranges — the API owns them, so a limit Tako raises works without an SDK release.

### Also corrected

`TakoKnowledgeCardMethodology.methodology_name` and `.methodology_description` are required keys with nullable values (`string | null`), not optional — matching the spec.

Documentation fixes: 2.x claimed inline contents were "capped at 1000 rows". The real behaviour is a 20-row default against a 2,000-row ceiling. Raise it with `maxRows` (see **New options** below).
