# @takoviz/ai-sdk

Tako tools for the [Vercel AI SDK](https://sdk.vercel.ai/) — give your agents access to Tako's knowledge base: charts and well-sourced data (`takoSearch`), synthesized answers (`takoAnswer`), and the underlying data behind any result (`takoContents`).

## Installation

```bash
npm install @takoviz/ai-sdk ai
```

## Setup

Get an API key from the [Tako dashboard](https://trytako.com) and set it as an environment variable:

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
  baseUrl: 'https://trytako.com', // optional; override for staging
  effort: 'fast',              // 'fast' (default) | 'instant' | 'deep'
  sources: {                   // a source is searched iff its key is present; omit to search both
    tako: { count: 5, includeContents: false, deferDataRetrieval: false },
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
  baseUrl: 'https://trytako.com',
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
  contents_total_cost: number;
  request_id: string;
}
```

`takoAnswer` additionally includes `answer: string` (with `cards[0]` as the lead card). `takoContents` resolves to `{ contents: TakoContentItem[]; request_id: string }`, where each item has a `format` (`'csv'` | `'text'`), a `cost`, and either a presigned `url`/`expires_at` (url mode) or inline `data`/`total_rows`/`truncated` (inline mode).

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
  TakoWebResult,
  TakoContentItem,
} from '@takoviz/ai-sdk';
```

## License

MIT

## Links

- [Tako documentation](https://docs.trytako.com)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [GitHub repository](https://github.com/TakoData/ai-sdk)
