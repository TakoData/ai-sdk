# Contributing

## Development

```bash
pnpm install
pnpm test          # vitest (mocked fetch — no live API calls)
pnpm typecheck     # tsc over src + tests + examples
pnpm build         # tsup → dist/
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

Publishing requires an `NPM_TOKEN` repo secret (an npm automation token with
publish rights to `@takoviz`). Until it's set, the publish job fails on the
release run while versioning/changelog/GitHub Release still succeed.
