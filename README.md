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
  model: openai('gpt-4o-mini'),
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

`takoSearch` and `takoAnswer` take the same config:

```typescript
takoSearch({
  apiKey: 'your_api_key',      // optional; defaults to TAKO_API_KEY
  baseUrl: 'https://tako.com', // optional; override for staging
  effort: 'fast',              // 'fast' (default) | 'instant' | 'deep'
  sources: {                   // a source is searched iff its key is present; omit to search both
    data: { count: 5, includeContents: false }, // legacy alias: tako
    web: { count: 5, includeContents: false },
  },
  countryCode: 'US',           // default 'US'
  locale: 'en-US',             // default 'en-US'
  timezone: 'America/New_York',// optional IANA timezone
  outputSettings: {
    imageDarkMode: false,
    forceRefresh: false,       // instant mode only
  },
});
```

`takoContents` takes:

```typescript
takoContents({
  apiKey: 'your_api_key',
  baseUrl: 'https://tako.com',
  mode: 'url',                 // 'url' (default) → presigned link; 'inline' → content in the response
});
```

The LLM supplies only the dynamic input: `{ query }` for `takoSearch`/`takoAnswer`, and `{ url }` (a card's `webpage_url` or a web result's `url`) for `takoContents`.

## Responses

`takoSearch` resolves to:

```typescript
{
  cards: TakoCard[];          // Tako knowledge cards (title, description, image_url, webpage_url, sources, ...)
  web_results: TakoWebResult[];
  request_id: string;
  usage?: TakoUsage | null;   // { total_cost_usd, compute?, data? }
}
```

`takoAnswer` additionally includes `answer: string` (with `cards[0]` as the lead card). `takoContents` resolves to `{ contents: TakoContentItem[]; request_id: string; usage? }`.

The API guarantees only `request_id` and omits empty collections, so the tools normalize: `cards`, `web_results` and `contents` are **always arrays**. No `?.` needed.

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

Which format you get depends on the surface: `takoContents` returns `'csv'` for cards and no format for web pages, while a card inlined by `sources.data.includeContents` arrives as `'json_compact'` (a `dataset`). Requesting a specific format is not configurable yet.

`content_format` is optional as well as nullable, so branch on it loosely — `content_format == null` means web text; `=== null` misses the absent case.

Full type definitions ship with the package.

## TypeScript

```typescript
import type {
  TakoRetrievalConfig,
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

The types mirror Tako's published OpenAPI document. `tests/contract/` validates them against a vendored copy of that spec and against [`tako-sdk`](https://www.npmjs.com/package/tako-sdk), Tako's official generated client, so API drift fails CI rather than shipping.

If you need the raw wire shapes (where collections are optional, before the tools normalize them), import `TakoSearchResponse`, `TakoAnswerResponse` or `TakoContentsResponse`.

## License

MIT

## Links

- [Migrating from 2.x](./MIGRATING.md)
- [Tako documentation](https://docs.tako.com)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [GitHub repository](https://github.com/TakoData/ai-sdk)
