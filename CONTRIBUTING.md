# Contributing

## Development

```bash
pnpm install
pnpm test          # vitest (mocked fetch — no live API calls)
pnpm test:contract # just tests/contract — the API contract suite
pnpm typecheck     # tsc over src + tests + examples
pnpm build         # tsup → dist/
pnpm spec:refresh  # re-vendor tests/contract/openapi.yaml from docs.tako.com
```

`pnpm test` includes `tests/contract/types.conformance.test.ts`, which shells out
to a cold `tsc` run, so expect it to take a second or two — much longer than the
rest of the suite. It is the slowest test and the one that fails if `src/types.ts`
drifts from the API.

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
