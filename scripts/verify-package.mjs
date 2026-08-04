#!/usr/bin/env node
/**
 * Install the packed tarball into a scratch project and use it as a consumer does.
 *
 * Every other test in this repo imports from `src/`. That leaves a class of
 * failure nobody sees until after publish, because it only exists in the
 * artifact: a devDependency imported at run time, a file missing from
 * `files`, an `exports` map a real resolver rejects, or a peer dependency the
 * package needs but does not declare. `npm pack` produces the same tarball
 * `npm publish` uploads, so this catches all four without burning a version.
 *
 * Deliberately uses `npm` for the scratch install, not pnpm: npm ships with
 * node, so this runs anywhere, and the scratch project must resolve the tarball
 * the way an ordinary consumer would rather than through a workspace link.
 *
 * Adds no dependency to this package. The type check reuses this repo's tsc
 * binary against the scratch project's files, so module resolution is the
 * scratch project's, not ours.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));

/** Packages that must never reach a consumer's install. */
const DEV_ONLY = ["tako-sdk", "ajv", "ajv-formats", "yaml", "tsup", "vitest", "typescript"];

let scratch;
let tarball;
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });

const step = (msg) => process.stdout.write(`  ${msg}\n`);
const fail = (msg) => {
  process.stderr.write(`\nFAIL: ${msg}\n`);
  process.exitCode = 1;
  throw new Error(msg);
};

try {
  process.stdout.write(`\nVerifying the packaged artifact for ${pkg.name}\n\n`);

  // Build first, so the tarball cannot lag src/. `npm pack` does not run
  // `prepublishOnly`, so nothing else guarantees this.
  step("building dist/");
  run("npm", ["run", "--silent", "build"], { cwd: REPO });
  if (!existsSync(join(REPO, "dist/index.js"))) fail("build produced no dist/index.js");

  step("packing");
  const packed = JSON.parse(run("npm", ["pack", "--json", "--silent"], { cwd: REPO }));
  tarball = resolve(REPO, packed[0].filename);
  if (!existsSync(tarball)) fail(`npm pack reported ${tarball}, which does not exist`);
  step(`packed ${packed[0].filename} (${packed[0].files.length} files, ${packed[0].size} bytes)`);

  // The tarball must carry the entry points package.json advertises.
  const shipped = packed[0].files.map((f) => f.path);
  for (const p of [pkg.main, pkg.types, pkg.exports?.["."]?.import, pkg.exports?.["."]?.types]) {
    if (!p) continue;
    const rel = p.replace(/^\.\//, "");
    if (!shipped.includes(rel)) fail(`package.json points at ${p}, which the tarball omits`);
  }
  step("tarball carries every advertised entry point");

  scratch = mkdtempSync(join(tmpdir(), "tako-ai-sdk-consumer-"));

  // Peer dependencies are installed explicitly. A consumer has to, and if the
  // package needs something it does not declare as a peer, the import below
  // fails here rather than in someone's app.
  const peers = Object.entries(pkg.peerDependencies ?? {}).map(([n, r]) => [n, r.split("||")[0].trim()]);
  writeFileSync(
    join(scratch, "package.json"),
    JSON.stringify(
      {
        name: "consumer-smoke",
        private: true,
        type: "module",
        dependencies: Object.fromEntries([[pkg.name, `file:${tarball}`], ...peers]),
      },
      null,
      2,
    ),
  );

  step("installing the tarball into a scratch project");
  run("npm", ["install", "--no-audit", "--no-fund", "--silent"], { cwd: scratch });

  // Nothing dev-only may have come along as a transitive runtime dependency.
  const leaked = DEV_ONLY.filter((d) => existsSync(join(scratch, "node_modules", d)));
  if (leaked.length) fail(`dev-only packages reached the consumer install: ${leaked.join(", ")}`);
  step("no dev-only package reached the install");

  // Runtime: import the built entry point and build all three tools.
  writeFileSync(
    join(scratch, "smoke.mjs"),
    `import { takoSearch, takoAnswer, takoContents } from "${pkg.name}";
import assert from "node:assert/strict";

for (const [name, factory] of [
  ["takoSearch", takoSearch],
  ["takoAnswer", takoAnswer],
  ["takoContents", takoContents],
]) {
  assert.equal(typeof factory, "function", name + " is not exported as a function");
  const tool = factory({ apiKey: "smoke-test-key" });
  assert.ok(tool.description?.length > 50, name + " built a tool with no usable description");
  assert.ok(tool.inputSchema, name + " built a tool with no inputSchema");
  assert.equal(typeof tool.execute, "function", name + " built a tool with no execute");
}

// The contents description varies with config, which only works if the real
// built module ran rather than a stub resolving to something else.
assert.notEqual(
  takoContents({ apiKey: "k" }).description,
  takoContents({ apiKey: "k", quoteOnly: true }).description,
  "takoContents description did not vary with config",
);

// A config the package rejects must still be rejected from the tarball.
assert.throws(
  () => takoSearch({ apiKey: "k", sources: { data: { strict: true } } }),
  /strict requires a non-empty nodeIds/,
  "the strict/nodeIds guard did not survive the build",
);

console.log("  runtime import and tool construction OK");
`,
  );
  step("importing the installed package");
  process.stdout.write(run("node", ["smoke.mjs"], { cwd: scratch }));

  // Types: resolve the shipped .d.ts under the strictest real-world resolution.
  // `nodenext` is the mode that actually reads the `exports` map, so a broken
  // map fails here even though a bundler would have papered over it.
  writeFileSync(
    join(scratch, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "nodenext",
          moduleResolution: "nodenext",
          target: "es2022",
          strict: true,
          noEmit: true,
          // Check our surface, not the peer dependencies' own typings. With this
          // false, tsc audits every .d.ts under node_modules and `ai`'s tree
          // reports missing @types/node and @types/json-schema — noise from
          // another package that would mask a real failure here. Resolution of
          // our `exports` map and every error in check.ts still surface.
          skipLibCheck: true,
          types: [],
        },
        files: ["check.ts"],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(scratch, "check.ts"),
    `import { takoSearch, takoContents } from "${pkg.name}";
import type {
  TakoRetrievalConfig,
  TakoContentsConfig,
  TakoDataSourceOptions,
  TakoWebSourceOptions,
  TakoGeoLocation,
  TakoWebCategory,
  TakoSearchResult,
} from "${pkg.name}";

// Exercise the option surface, so a type that failed to ship fails the compile.
const retrieval: TakoRetrievalConfig = {
  effort: "deep",
  location: { latitude: 1, longitude: 2 } satisfies TakoGeoLocation,
  sources: {
    data: { nodeIds: ["a"], strict: true, contentFormat: "json_compact" } satisfies TakoDataSourceOptions,
    web: { category: "news" satisfies TakoWebCategory, includeDomains: ["e.com"] } satisfies TakoWebSourceOptions,
  },
};
const contents: TakoContentsConfig = { mode: "inline", maxRows: 100, quoteOnly: true };

const s = takoSearch(retrieval);
const c = takoContents(contents);
void s;
void c;

// The result type must be reachable and shaped as documented.
declare const result: TakoSearchResult;
const n: number = result.cards.length;
void n;
`,
  );
  step("type-checking the shipped .d.ts under nodenext resolution");
  try {
    run(join(REPO, "node_modules/.bin/tsc"), ["-p", "tsconfig.json"], { cwd: scratch });
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
    fail(`the shipped types did not compile for a consumer:\n${out || "(no diagnostics)"}`);
  }

  process.stdout.write(`\nPackage verified: ${pkg.name} installs, imports, and type-checks.\n\n`);
} finally {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  if (tarball) rmSync(tarball, { force: true });
}
