import { generateText, isStepCount } from "ai";
import { openai } from "@ai-sdk/openai";
import { takoAnswer } from "../src/index";

// Run: pnpm exec tsx --env-file=.env examples/answer.ts
async function main() {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Did AMD or Nvidia grow its headcount faster over the last decade?",
    tools: { tako_answer: takoAnswer({ effort: "deep" }) },
    stopWhen: isStepCount(5),
  });
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
