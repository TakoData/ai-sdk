# Contributing

## Development

```bash
pnpm install
pnpm test          # vitest (mocked fetch — no live API calls)
pnpm typecheck     # tsc over src + tests + examples
pnpm build         # tsup → dist/
pnpm lint:package  # publint + are-the-types-wrong, against the packed tarball
pnpm test:package  # install the tarball in a scratch project and use it
pnpm test:live     # real API calls — needs TAKO_API_KEY, costs money
pnpm check:sdk-lag  # fail if npm has a tako-sdk major our range can't reach
```

## Testing what consumers actually install

`pnpm test` imports from `src/`, so it cannot see a fault that exists only in the
published artifact: a file missing from `files`, an `exports` map a real resolver
rejects, a devDependency imported at run time, or a peer dependency the package
needs but does not declare. **You do not need to publish to find these.**
`npm pack` produces the same tarball `npm publish` uploads, and an npm version
cannot be republished — so a fault caught before publish costs nothing and the
same fault caught after costs a version.

- `pnpm lint:package` runs `publint` and `are-the-types-wrong` over the packed
  tarball. Both run through `npx` rather than as devDependencies, so this adds
  nothing to the lockfile. `publint` is pinned to `--pack npm` because `npm` ships
  with node and the result is then the same everywhere.
  `are-the-types-wrong` ignores `cjs-resolves-to-esm`: this package is ESM-only on
  purpose, so a CommonJS consumer using `await import()` is the intended contract,
  not a defect.
- `pnpm test:package` (`scripts/verify-package.mjs`) packs, installs the tarball
  into a scratch project with the peer dependencies a consumer would install,
  imports the package, builds all three tools, and type-checks a snippet against
  the shipped `.d.ts` under `nodenext` resolution — the mode that actually reads
  the `exports` map.

Both run in `ci.yml` and again in the publish job, ahead of `pnpm publish`.

The type check sets `skipLibCheck: true` on purpose. With it false, `tsc` audits
every `.d.ts` under `node_modules`, and the `ai` package's own tree reports
missing `@types/node` and `@types/json-schema` — another package's noise, loud
enough to hide a real failure here.

## Checking the API itself (`tests/live/`)

`pnpm test` runs against a stubbed `fetch`, so it proves the request bodies this
package builds and the normalization it applies — not that the API accepts an
option or still returns the envelope. `tests/live/` sends real requests to check
that. Whether the API matches its OpenAPI spec is `tako-sdk`'s contract (its
types are generated from that spec) and the Tako monorepo's conformance suite's
job; this package doesn't vendor a spec any more.

```bash
TAKO_API_KEY=... pnpm test:live
TAKO_API_KEY=... TAKO_BASE_URL=https://some-other-host pnpm test:live   # optional
```

- **Excluded from `pnpm test`** by `vitest.config.ts`, and only included by
  `vitest.live.config.ts`. It costs money, so it must never run by accident.
- **Skips without a key** rather than failing, so a contributor with no key sees
  no red.
- **Runs on a schedule** (`.github/workflows/live.yml`, Mondays 13:00 UTC) plus
  manual dispatch. Never on `pull_request`: forks cannot read secrets, so it
  would fail for every outside contributor.
- Serial, with one retry, because the tests compare responses across requests and
  Tako throttles per key.

Two rules for anything you add there:

1. **Assert contract, never content.** "A card came back" is stable. "The first
   card is Nvidia revenue" is one ranking change from a false alarm.
2. **Never trigger a billed export.** `quote_only` prices one for free, and that is
   the only way this suite touches export pricing.

## Tracking `tako-sdk`

Wire types come from `tako-sdk`, so an API change reaches this package as a
version bump, not as a hand-edited type:

1. Dependabot opens a `chore(deps): bump tako-sdk` PR daily when there is one
   (`.github/dependabot.yml`, scoped to `tako-sdk` only).
2. `ci` runs against the new version on that PR. That is the point of the PR:
   it is a canary, not a delivery mechanism. Review and merge it by hand.
3. A major bump needs more than a merge. Read the `tako-sdk` changelog, widen
   the range, and fix whatever `pnpm typecheck` and `pnpm test` report.
4. `pnpm check:sdk-lag` (in `ci.yml` and the weekly `live.yml`) fails when npm
   has a `tako-sdk` major the range in `package.json` can't reach, so step 3
   can't be forgotten.

**When a Dependabot PR is red**, the API changed shape under the tool layer —
a config key derived from a request type, or a response field a normalizer
reads. The failure names the file: a request-shape change fails the pins in
`tests/config_types.test.ts`, and the edit is an `Omit` list in `src/types.ts`;
a response change fails a normalizer in `src/request.ts`. Don't pin the old
version.

A `chore(deps)` merge doesn't cut a release, and it isn't how consumers get the
new `tako-sdk` either — the range is a caret, so they resolve it at their next
install whether or not this repo ever merges the bump. Merging only moves this
repo's lockfile. This package releases when its own tool layer changes.

Since 4.0 that caret carries more than it used to, so treat those pins as a
lagging indicator, not a gate. Under 3.x a `tako-sdk` minor moved only the wire
types and the hand-written config was structurally immune. Now the `Omit` lists
in `src/types.ts` ship unresolved in `dist/index.d.ts` and bind to whatever
`tako-sdk` the consumer installed, so a minor can change this package's public
config type in their tree. The pins redden here on the Dependabot PR — after
those consumers have already resolved it. `check:sdk-lag` fires on a major only.

Nothing merges itself here. Auto-merge was considered and dropped: it would
require enabling "Allow auto-merge" and making `build-test` a required check on
`main`, and `gh pr merge --auto` merges immediately when there is no required
check to wait for. Given the caret, it would have bought hygiene, not safety.

The Dependabot config waits two days before opening a bump, and that delay is
load-bearing. pnpm 11 enforces a 24-hour `minimumReleaseAge`, and
`pnpm install --frozen-lockfile` rejects a lockfile entry published inside that
window (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`). A PR opened any sooner goes
red on install, which says nothing about whether the new SDK actually broke
anything — and a check that is red for a reason nobody acts on is how a real
failure gets ignored.

## Examples

Examples make live calls; run them manually with keys set in `.env` (see `.env.example`):

```bash
pnpm exec tsx --env-file=.env examples/answer.ts
```

## Commits & releases

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) and
[release-please](https://github.com/googleapis/release-please). Versioning and
`CHANGELOG.md` are automated — do **not** bump `version` in `package.json` by hand.

- `fix:` → patch, `feat:` → minor, `feat!:` / `BREAKING CHANGE:` → major.
- On every push to `main`, release-please maintains a "release PR" with the next
  version + changelog.
- **Merging that release PR** tags the release and triggers the publish workflow,
  which runs `pnpm publish --no-git-checks --provenance --access public`.

> **Merge PRs with squash or rebase — not a merge commit.** release-please
> reads `main`'s first-parent history. A merge commit keeps a PR's conventional
> commits off that line, so release-please sees nothing and opens no release PR.
> Squash (or rebase) puts the conventional commit(s) directly on `main`.

Publishing requires an `NPM_TOKEN` repo secret (an npm automation token with
publish rights to `@takoviz`). Until it's set, the publish job fails on the
release run while versioning/changelog/GitHub Release still succeed.
