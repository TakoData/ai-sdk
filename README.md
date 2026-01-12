# Tako AI SDK

Add powerful knowledge search with data visualizations to your AI applications using Tako's knowledge base.

## Installation

```bash
npm install @takoviz/ai-sdk ai
```

## Setup

Get your API key from the [Tako Dashboard](https://trytako.com) and set it as an environment variable:

```bash
export TAKO_API_KEY=your_api_key_here
```

## Quick Start

```typescript
import { takoSearch } from '@takoviz/ai-sdk';
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-4o-mini',
  prompt: 'What is the stock price of Nvidia?',
  tools: {
    takoSearch: takoSearch(),
  },
  maxSteps: 5,
});

console.log(text);
```

## Configuration Options

You can customize the search behavior by passing a configuration object:

```typescript
const { text } = await generateText({
  model: 'openai/gpt-4o-mini',
  prompt: 'What is the GDP of major economies?',
  tools: {
    takoSearch: takoSearch({
      apiKey: 'your_api_key', // Optional: override environment variable
      sourceIndexes: ['tako', 'web'], // Default: ['tako', 'web']
      searchEffort: 'deep', // Options: 'fast', 'deep', 'auto'. Default: 'fast'
      countryCode: 'US', // Default: 'US'
      locale: 'en-US', // Default: 'en-US'
      outputSettings: {
        knowledgeCardSettings: {
          imageDarkMode: true, // Default: false
        },
      },
    }),
  },
  maxSteps: 5,
});
```

## API Reference

### `takoSearch(config?: TakoSearchConfig)`

Creates a Tako knowledge search tool for use with Vercel AI SDK.

#### Parameters

- `config.apiKey` (optional): Tako API key. Defaults to `TAKO_API_KEY` environment variable.
- `config.sourceIndexes` (optional): Array of index sources to search. Options: `'tako'`, `'web'`, `'connected_data'`. Default: `['tako', 'web']`.
- `config.searchEffort` (optional): Search depth. Options: `'fast'`, `'deep'`, `'auto'`. Default: `'fast'`.
- `config.countryCode` (optional): ISO3166-1 alpha-2 country code. Default: `'US'`.
- `config.locale` (optional): Language/region identifier. Default: `'en-US'`.
- `config.outputSettings` (optional): Output customization options.

#### Returns

A Vercel AI SDK tool that accepts a natural language query and returns Tako knowledge cards with visualizations, data, and sources.

## Response Format

The tool returns a `TakoSearchResponse` object:

```typescript
{
  outputs: {
    knowledge_cards: [
      {
        card_id: string;
        title: string;
        description: string;
        webpage_url: string;
        image_url: string;
        sources: Array<{ source_name: string; url: string }>;
        visualization_data: {
          data: any[];
          viz_config: Record<string, any>;
        };
      }
    ];
    answer: string;
  };
  request_id: string;
}
```

## TypeScript

This package includes full TypeScript type definitions. Import types as needed:

```typescript
import type { TakoSearchConfig, TakoSearchResponse, TakoKnowledgeCard } from '@takodata/ai-sdk';
```

## License

MIT

## Links

- [Tako Documentation](https://docs.tako.com)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [GitHub Repository](https://github.com/TakoData/ai-sdk)
