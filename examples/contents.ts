import { takoSearch, takoContents } from "../src/index";
import type { TakoContentsResult, TakoSearchResult } from "../src/index";

// Run: pnpm exec tsx --env-file=.env examples/contents.ts
// Cast: calling a tool's execute() directly (outside generateText) needs a
// ToolExecutionOptions stub; the fields below are all our tools actually use.
const opts = { toolCallId: "example", messages: [] } as any;

async function main() {
  const search = takoSearch();
  const result = (await search.execute!(
    { query: "Nvidia full-time employees since 2013" },
    opts,
  )) as TakoSearchResult;

  // `cards` and `web_results` are always arrays — the tools normalize the
  // API's optional collections, so no guard is needed here.
  console.log(`${result.cards.length} cards, ${result.web_results.length} web results`);

  // Only exportable cards can be downloaded; a non-exportable card returns 403,
  // so filtering on the flag avoids a call that cannot succeed. Web results are
  // always downloadable as text.
  const candidates: string[] = [
    ...result.cards.filter((c) => c.exportable).map((c) => c.webpage_url),
    ...result.web_results.map((w) => w.url),
  ].filter((url): url is string => Boolean(url));

  const skipped = result.cards.filter((c) => !c.exportable).length;
  if (skipped) console.log(`Skipped ${skipped} card(s) whose data is not exportable.`);

  const contents = takoContents({ mode: "inline" });
  for (const url of candidates) {
    try {
      const downloaded = (await contents.execute!({ url }, opts)) as TakoContentsResult;
      const item = downloaded.contents[0];
      if (!item) continue;

      console.log("Source:", url);
      // content_format names the serialization for a card's tabular data. For web
      // page text it is null — or absent entirely, since the field is optional —
      // so compare loosely rather than with `=== null`.
      console.log(
        item.content_format == null
          ? "Web page text"
          : `Card data (${item.content_format})`,
        "| cost:",
        item.cost,
      );
      if (item.total_rows != null) {
        console.log(`Rows: ${item.total_rows}${item.truncated ? " (truncated)" : ""}`);
      }
      console.log("Data (first 500 chars):\n", item.data?.slice(0, 500));
      // Per-item cost is what the API populates; the aggregate `usage` is not.
      console.log("Item cost (USD):", item.cost ?? 0);
      return;
    } catch (err) {
      // `exportable: true` is eligibility, not a guarantee — still fall back.
      console.log(`Skip ${url}: ${(err as Error).message}`);
    }
  }
  console.log("None of the results exposed downloadable contents.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
