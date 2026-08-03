# Migrating

## 2.x → 3.0

Tako's API moved on between June and August 2026 and this SDK's types did not follow. 3.0 realigns them. Every change below is a case where 2.x described something the API no longer does — so if code depended on it, it was already broken at runtime, whatever TypeScript said.

`tests/contract/` now validates these types against Tako's published OpenAPI document and against [`tako-sdk`](https://www.npmjs.com/package/tako-sdk), Tako's official generated client, so this class of drift fails CI from now on.

### Config

| 2.x | 3.0 |
| --- | --- |
| `sources.data.deferDataRetrieval` | **Removed.** No replacement. |

The API removed `defer_data_retrieval` from its data-source settings, and those settings forbid unknown properties — so any request that set this option was **rejected outright**, not silently ignored. Delete the option; the request starts working.

### Responses

| 2.x | 3.0 |
| --- | --- |
| `result.contents_total_cost: number` | `result.usage?.total_cost_usd` |
| `content.format` | `content.content_format` |
| `TakoContentFormat = 'csv' \| 'text'` | `'csv' \| 'json_records' \| 'json_compact'` |

**Cost.** `contents_total_cost` no longer exists. `usage` replaces it and adds a breakdown:

```ts
// 2.x
const cost = result.contents_total_cost;          // undefined at runtime

// 3.0
const cost = result.usage?.total_cost_usd ?? 0;
const compute = result.usage?.compute?.cost_usd;  // running the operation
const data = result.usage?.data?.cost_usd;        // inline data delivered
```

**Content format.** The field was renamed *and* its values changed. `'text'` is gone: web page text is now signalled by `content_format === null`.

```ts
// 2.x
if (item.format === 'csv') parseCsv(item.data);
else if (item.format === 'text') readProse(item.data);   // both branches dead

// 3.0
if (item.content_format === null) readProse(item.data);  // web page text
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

`source_index` is also a plain string now. 2.x modelled it as a union that could be an object (`{ index_type, segment_id }`), which the API has never sent on this surface — any code narrowing on that shape can be deleted.

### Guaranteed collections

The API guarantees only `request_id` (plus `answer` on the answer surface) and omits empty collections rather than sending `[]`. 2.x typed `cards`, `web_results` and `contents` as always-present, so `result.cards.length` could throw on a perfectly valid response.

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

### Also corrected

`TakoKnowledgeCardMethodology.methodology_name` and `.methodology_description` are required keys with nullable values (`string | null`), not optional — matching the spec.

Documentation fixes: 2.x claimed inline contents were "capped at 1000 rows". The real behaviour is a 20-row default against a 2,000-row ceiling. Raising it needs `max_rows`, which this SDK does not expose yet.
