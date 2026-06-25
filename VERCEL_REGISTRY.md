# Submitting Tako to the AI SDK Tools Registry

After `@takoviz/ai-sdk` 2.0.0 is published to npm, submit it to the AI SDK Tools
Registry.

> ⚠️ **Verify the current process before submitting.** The registry is the
> shadcn-based **AI SDK Tools Registry** (https://ai-sdk.dev/tools-registry,
> mirrored at https://ai-tools-registry.vercel.app / https://ai-sdk-agents.vercel.app),
> which distributes tool *files* via the shadcn CLI. This is **not** the old
> `vercel/ai` `content/tools-registry/registry.ts` array. Open the live registry's
> GitHub repo + contribution guide and confirm the exact entry format before
> opening a PR.

## Prerequisites

- Package published to npm at `@takoviz/ai-sdk`
- README with clear setup + examples
- `TAKO_API_KEY` documented

## Draft entry content (adapt to the live registry's schema)

- **name:** Tako
- **slug:** `tako`
- **package:** `@takoviz/ai-sdk`
- **description:** "Search Tako's knowledge base for visualized data and well-sourced
  answers, and download the underlying data behind any result. Tools: takoSearch,
  takoAnswer, takoContents."
- **api key:** env `TAKO_API_KEY`, from https://trytako.com
- **code example:**

```typescript
import { takoAnswer } from '@takoviz/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';

const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: 'Did AMD or Nvidia grow headcount faster over the last decade?',
  tools: { tako_answer: takoAnswer() },
  stopWhen: stepCountIs(5),
});

console.log(text);
```

## Open questions for sub-project B

- Does the registry entry reference the published npm package, or vendor tool
  files via the shadcn CLI?
- Single `tako` entry vs. per-tool entries (`tako-search`, `tako-answer`, `tako-contents`)?
- Fork/PR target: the live registry's GitHub repo (confirm URL), following its
  CONTRIBUTING guide.
