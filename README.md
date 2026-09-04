# @takoviz/ai-sdk

Tako tools for the [Vercel AI SDK](https://sdk.vercel.ai/) — give your agents access to Tako's knowledge base: charts and well-sourced data (`takoSearch`), synthesized answers (`takoAnswer`), and the underlying data behind any result (`takoContents`).

## Installation

```bash
npm install @takoviz/ai-sdk ai
```

## Setup

Get an API key from the [Tako developer console](https://tako.com/console/api-keys) and set it as an environment variable:

```bash
export TAKO_API_KEY=your_api_key_here
```

## Tools

| Tool | Endpoint | What it does |
| --- | --- | --- |
| `takoSearch()` | `POST /api/v3/search` | Fast retrieval: Tako cards + web results, no synthesis |
| `takoAnswer()` | `POST /api/v1/answer` | Retrieval **plus** an LLM-synthesized, sourced answer |
| `takoContents()` | `POST /api/v1/contents` | Download a result's data (card CSV or web page text) |

## Quick start

```typescript
import { takoAnswer } from '@takoviz/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { generateText, isStepCount } from 'ai';

const { text } = await generateText({
  model: openai('gpt-5.4-mini'),
  prompt: 'Did AMD or Nvidia grow headcount faster over the last decade?',
  tools: { tako_answer: takoAnswer() },
  stopWhen: isStepCount(5),
});

console.log(text);
```

Give the agent the full toolset so it can search, answer, and drill into data:

```typescript
import { takoSearch, takoAnswer, takoContents } from '@takoviz/ai-sdk';

const tools = {
  tako_search: takoSearch(),
  tako_answer: takoAnswer(),
  tako_contents: takoContents(),
};
```

## Configuration

A tool's config is the API request body for its endpoint, minus the field the model supplies, plus `apiKey` and `baseUrl`. Keys are the API's own names, exactly as [`tako-sdk`](https://www.npmjs.com/package/tako-sdk) declares them, so every option in the [API reference](https://docs.tako.com) works here without a release of this package.

| Tool | Config type | Is the request body of | Minus |
| --- | --- | --- | --- |
| `takoSearch` | `TakoRetrievalConfig` | `POST /api/v3/search` | `query` |
| `takoAnswer` | `TakoAnswerConfig` | `POST /api/v1/answer` | `query` |
| `takoContents` | `TakoContentsConfig` | `POST /api/v1/contents` | `url` |

Every field is optional. Omit one and the API's default applies; this package restates none of them. The model supplies only `{ query }` or `{ url }` per call.

Three `sources.data` keys aren't exposed, because you can't use them correctly from here: `mode` (the API documents it as having no effect on Tako cards), and `node_ids` with `strict` (they take graph ids from endpoints this package doesn't wrap). Call the API through `tako-sdk` directly if you need them.

### Examples

Deep search over Tako's data only, ten cards, with the rows inlined as typed columns:

```typescript
takoSearch({
  effort: 'deep',
  sources: { data: { count: 10, include_contents: true, content_format: 'json_compact' } },
});
```

News from the last week. Build dates with the ISO-string constructor: `new Date('2026-08-19')` is UTC midnight and serializes as that day everywhere; `new Date(2026, 7, 19)` is local midnight and serializes as the day before in any UTC+ timezone.

Check that your date parsed before you pass it. `new Date()` returns an `Invalid Date` for a string it can't read, and that fails during serialization, so the tool call rejects with `Failed to search with Tako: Invalid time value` — a message that names neither the field nor the value, and reaches the model rather than you. The request never leaves the process.

```typescript
takoSearch({
  sources: { web: { category: 'news', published_after: new Date('2026-08-19'), count: 5 } },
});
```

An answer shaped by a JSON Schema. Tako fills it from the same evidence as `answer` and returns it as `structured_output`; a nullable type is how you let it say "no evidence" instead of inventing a zero.

```typescript
takoAnswer({
  output_schema: {
    type: 'object',
    properties: {
      revenue_usd: { type: ['number', 'null'], description: 'Latest annual revenue in USD' },
      fiscal_year: { type: ['integer', 'null'] },
    },
    required: ['revenue_usd', 'fiscal_year'],
    additionalProperties: false,
  },
});
```

A `TakoRetrievalConfig` is also a valid `TakoAnswerConfig`, so one object can build both tools.

### Contents delivery

Two `takoContents` options also change the description the model reads, so pick them deliberately:

- `mode: 'url'` returns a short-lived presigned download link. The description tells the model to surface the link, not parse it.
- `mode: 'inline'` returns the rows or page text in the response. The description tells the model to read and compute over them.
- `quote_only: true` returns the export price and no content, for free. The description tells the model to report the price and not call again expecting rows.

Leave `mode` unset and the API chooses — `'url'` today. This package sends no default and names none in the description; the model is told to read the response instead. Set `mode` to pin the delivery and tell the model which one to expect.

`max_rows` fails quietly: a value over the 2,000-row ceiling is clamped, not rejected, and every row returned is billed. Read `total_rows` and `truncated` on the item to see what you got.

## Caller channel

Requests report a fixed `X-Tako-Caller` header so Tako can measure this
integration's share of API traffic:

```
X-Tako-Caller: channel=ai_sdk, client_version="<tako-sdk version>"
```

The version is the underlying `tako-sdk` client's, not this package's — it names
the client that makes the call. The header carries nothing about you or your
query. It doesn't change what a request returns or how it's billed, and you can't
set or disable it.

## Responses

`takoSearch` resolves to:

```typescript
{
  cards: TakoCard[];          // Tako knowledge cards (title, description, image_url, webpage_url, sources, ...)
  web_results: TakoWebResult[];
  request_id: string;
  usage?: TakoUsage | null;   // { total_cost_usd, compute?, data? } — see note
}
```

> **Cost reporting.** `usage` is what the API spec defines for per-request cost, but as of 2026-08 it is not populated on any endpoint. For pricing today, read the per-item `content.cost` and `content.export_pricing` on each card, which are populated.

`takoAnswer` additionally includes `answer: string` (with `cards[0]` as the lead card). `takoContents` resolves to `{ contents: TakoContentItem[]; request_id: string; usage? }`.

The API guarantees only `request_id` — the contract permits omitting the collections — so the tools normalize: `cards`, `web_results` and `contents` are **always arrays**. No `?.` needed.

### Reading a card

Two fields are worth knowing about:

- **`exportable`** — whether `takoContents` can download that card's data. `false` means don't bother; the call returns 403. `true` is eligibility, not a guarantee, so still handle errors.
- **`data_freshness`** — `{ data_as_of, last_updated }`, so you can tell how current a number is.

### Reading a contents item

Each item carries a `cost` (USD) and either a presigned `url` + `expires_at` (url mode) or an inline payload (inline mode). `content_format` tells you what you got:

| `content_format` | Payload field | Meaning |
| --- | --- | --- |
| `null` *or absent* | `data` | A web page's extracted text |
| `'csv'` | `data` | Card data as CSV |
| `'json_records'` | `records` | Card data as row objects |
| `'json_compact'` | `dataset` | Card data as typed columns + positional rows |

`total_rows` and `truncated` tell you whether the card held more rows than were returned.

Which format you get depends on the surface. Left unset, `takoContents` returns `'csv'` for cards and no format for web pages, while a card inlined by `sources.data.include_contents` arrives as `'json_compact'` (a `dataset`). Set `content_format` to choose: on `takoContents` for an explicit fetch, or on `sources.data` for a card inlined by a search.

`content_format` is optional as well as nullable, so branch on it loosely — `content_format == null` means web text; `=== null` misses the absent case.

Full type definitions ship with the package.

## TypeScript

```typescript
import type {
  TakoRetrievalConfig,
  TakoAnswerConfig,
  TakoContentsConfig,
  TakoSearchResult,
  TakoAnswerResult,
  TakoContentsResult,
  TakoCard,
  TakoCardSource,
  TakoWebResult,
  TakoContentItem,
  TakoDataset,
  TakoUsage,
} from '@takoviz/ai-sdk';
```

Every wire type is [`tako-sdk`](https://www.npmjs.com/package/tako-sdk)'s, Tako's client generated from the OpenAPI spec, re-exported under the names above. This package declares only its config types and the normalized tool results. When the API adds a field, it appears here as soon as `tako-sdk` publishes — no release of this package needed.

`tako-sdk` is a runtime dependency. It uses the global `fetch` and runs wherever this package does.

If you need the raw wire shapes (where collections are optional, before the tools normalize them), import `TakoSearchResponse`, `TakoAnswerResponse` or `TakoContentsResponse`.

## License

MIT

## Links

- [Migrating from 3.x](./MIGRATING.md#3x--40)
- [Migrating from 2.x](./MIGRATING.md#2x--30)
- [Tako documentation](https://docs.tako.com)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [GitHub repository](https://github.com/TakoData/ai-sdk)
