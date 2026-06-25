import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { takoSearch } from "../src/index";

// Run: pnpm exec tsx --env-file=.env examples/search.ts
async function main() {
  const { text, steps } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Compare Nvidia and AMD full-time employee counts since 2013.",
    tools: { tako_search: takoSearch() },
    stopWhen: stepCountIs(5),
  });
  console.log("Answer:\n", text);
  console.log("\nSteps:", steps.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
