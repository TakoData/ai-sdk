import { takoSearch } from './src/index.js';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function test() {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: 'What is the stock price of Nvidia?',
    tools: {
      takoSearch: takoSearch(),
    },
    maxSteps: 5,
  });

  console.log('Result text:', result.text);
  console.log('\nTool calls:', JSON.stringify(result.toolCalls, null, 2));
  console.log('\nTool results:', JSON.stringify(result.toolResults, null, 2));
  console.log('\nSteps:', result.steps.length);
  console.log('\nWarnings:', result.warnings);
}

test().catch(console.error);
