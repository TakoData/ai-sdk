import { takoSearch, takoContents } from "../src/index";

// Run: pnpm exec tsx --env-file=.env examples/contents.ts
const opts = { toolCallId: "example", messages: [] };

async function main() {
  const search = takoSearch();
  const result = (await search.execute!(
    { query: "Nvidia full-time employees since 2013" },
    opts,
  )) as any;

  // Candidate URLs to drill into: card data first, then web results. Some Tako
  // cards come from protected sources whose data can't be exported (the API
  // returns 403) — so try each until one resolves, the way an agent would.
  const candidates: string[] = [
    ...(result.cards ?? []).map((c: any) => c.webpage_url),
    ...(result.web_results ?? []).map((w: any) => w.url),
  ].filter(Boolean);

  const contents = takoContents({ mode: "inline" });
  for (const url of candidates) {
    try {
      const downloaded = (await contents.execute!({ url }, opts)) as any;
      const item = downloaded.contents?.[0];
      console.log("Source:", url);
      console.log("Format:", item?.format, "| cost:", item?.cost);
      console.log("Data (first 500 chars):\n", item?.data?.slice(0, 500));
      return;
    } catch (err) {
      console.log(`Skip ${url}: ${(err as Error).message}`);
    }
  }
  console.log("None of the results exposed downloadable contents.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
