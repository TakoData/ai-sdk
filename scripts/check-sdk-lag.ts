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
// Not reaching the registry is not evidence of lag, so this fails open. A red
// run here would say nothing about the pull request that triggered it, and a
// check that is red for a reason nobody acts on is how a real failure gets
// ignored. A genuinely missing package still fails loudly one step earlier, at
// `pnpm install --frozen-lockfile`.
let latest: string;
try {
  // stderr is piped, not inherited. Left to Node's default it goes straight to
  // the parent and `error.stderr` is null, so the message below says only that
  // npm failed and never what npm said.
  latest = execFileSync("npm", ["view", DEP, "version"], {
    encoding: "utf8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
} catch (error) {
  // A registry that refuses the connection reports through stderr; one that
  // hangs until `timeout` fires is killed with SIGTERM and leaves both streams
  // empty, so the message ("spawnSync npm ETIMEDOUT") is the only detail there.
  const stderr = error instanceof Error && "stderr" in error ? String(error.stderr ?? "").trim() : "";
  const detail = stderr || (error instanceof Error ? error.message : String(error));
  console.warn(`skipping the ${DEP} lag check: npm view failed\n${detail}`);
  process.exit(0);
}
if (isLagging(range, latest)) {
  console.error(
    `${DEP}@${latest} is published but package.json pins ${JSON.stringify(range)}. ` +
      `A new major needs a human: read its changelog, bump the range, and fix what breaks.`,
  );
  process.exit(1);
}
console.log(`${DEP} range ${range} reaches the published version (${latest})`);
