import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isLagging } from "./sdk-lag";

const DEP = "tako-sdk";
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
const range: string | undefined = pkg.dependencies?.[DEP];
if (!range) {
  console.error(`${DEP} is not in dependencies`);
  process.exit(1);
}
const latest = execFileSync("npm", ["view", DEP, "version"], { encoding: "utf8" }).trim();
if (isLagging(range, latest)) {
  console.error(
    `${DEP}@${latest} is published but package.json pins ${JSON.stringify(range)}. ` +
      `A new major needs a human: read its changelog, bump the range, and fix what breaks.`,
  );
  process.exit(1);
}
console.log(`${DEP} range ${range} covers the published major (${latest})`);
