# Contributing

## Development

```bash
pnpm install
pnpm test          # vitest (mocked fetch — no live API calls)
pnpm test:contract # just tests/contract — the API contract suite
pnpm typecheck     # tsc over src + tests + examples
pnpm build         # tsup → dist/
pnpm lint:package  # publint + are-the-types-wrong, against the packed tarball
pnpm test:package  # install the tarball in a scratch project and use it
pnpm spec:refresh  # re-vendor tests/contract/openapi.yaml from docs.tako.com
```

`pnpm test` includes `tests/contract/types.conformance.test.ts`, which shells out
to a cold `tsc` run, so expect it to take a second or two — much longer than the
rest of the suite. It is the slowest test and the one that fails if `src/types.ts`
drifts from the API.

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

## Keeping the API contract honest

`tests/contract/` checks this SDK's types against two pinned references: the
vendored `openapi.yaml` and the `tako-sdk` version in the lockfile. Both are
snapshots, so **the suite catches a regression in this repo, not a change Tako
ships.** To check for upstream drift, refresh them and re-run:

```bash
pnpm spec:refresh
pnpm update tako-sdk --latest
pnpm test
```

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
