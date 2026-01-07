# Adding Tako to Vercel AI Registry

After publishing to npm, follow these steps to add Tako to the official Vercel AI tools registry.

## Prerequisites

- ✅ Package published to npm at `@takodata/ai-sdk`
- ✅ README with clear documentation
- ✅ Working code example tested
- ✅ API key instructions in README

## Steps

### 1. Fork and Clone Vercel AI Repository

```bash
git clone https://github.com/vercel/ai.git
cd ai
pnpm install
```

### 2. Create Feature Branch

```bash
git checkout -b feat/add-tool-tako-search
```

### 3. Add Tool Entry

Edit `content/tools-registry/registry.ts` and add this entry to the tools array:

```typescript
{
  slug: 'tako-search',
  name: 'Tako Search',
  description: 'Search Tako\'s knowledge base for data visualizations, insights, and well-sourced information with charts and analytics.',
  packageName: '@takodata/ai-sdk',
  installCommand: {
    pnpm: 'pnpm add @takodata/ai-sdk',
    npm: 'npm install @takodata/ai-sdk',
    yarn: 'yarn add @takodata/ai-sdk',
    bun: 'bun add @takodata/ai-sdk',
  },
  codeExample: `import { takoSearch } from '@takodata/ai-sdk';
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-4o-mini',
  prompt: 'What is the stock price of Nvidia?',
  tools: {
    takoSearch: takoSearch(),
  },
  maxSteps: 5,
});

console.log(text);`,
  docsUrl: 'https://github.com/TakoData/ai-sdk#readme',
  npmUrl: 'https://www.npmjs.com/package/@takodata/ai-sdk',
  websiteUrl: 'https://tako.com',
  apiKeyEnvName: 'TAKO_API_KEY',
  apiKeyUrl: 'https://trytako.com',
  tags: ['search', 'data', 'visualization', 'analytics'],
},
```

### 4. Test Locally

```bash
pnpm dev
```

Navigate to the tools registry page and verify your tool appears correctly.

### 5. Create Pull Request

```bash
git add content/tools-registry/registry.ts
git commit -m "feat(tools-registry): add tako-search"
git push origin feat/add-tool-tako-search
```

Then:
1. Go to https://github.com/vercel/ai
2. Click "New Pull Request"
3. Use title: `feat(tools-registry): add tako-search`
4. Description:
   ```
   Adds Tako Search tool to the registry.

   Tako Search provides access to Tako's knowledge base with data visualizations,
   charts, and well-sourced analytics for AI applications.

   - Package: @takodata/ai-sdk
   - Docs: https://github.com/TakoData/ai-sdk
   - Website: https://tako.com
   ```

### 6. Wait for Review

The Vercel team will review and merge your PR. Once merged, Tako will appear in the official AI SDK tools registry at https://sdk.vercel.ai/docs/ai-sdk-ui/tools-registry!

## Reference

Official guide: https://github.com/vercel/ai/blob/main/contributing/add-new-tool-to-registry.md
