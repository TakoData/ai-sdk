import { takoSearch, takoContents } from "../src/index";

// Run: pnpm exec tsx --env-file=.env examples/contents.ts
const opts = { toolCallId: "example", messages: [] };

async function main() {
  const search = takoSearch();
  const result = (await search.execute!(
    { query: "Nvidia full-time employees since 2013" },
    opts,
  )) as any;
  const firstCardUrl = result.cards?.[0]?.webpage_url;
  if (!firstCardUrl) {
    console.log("No card returned.");
    return;
  }
  const contents = takoContents({ mode: "inline" });
  const downloaded = (await contents.execute!({ url: firstCardUrl }, opts)) as any;
  console.log("Format:", downloaded.contents?.[0]?.format);
  console.log("Data (first rows):\n", downloaded.contents?.[0]?.data?.slice(0, 500));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
